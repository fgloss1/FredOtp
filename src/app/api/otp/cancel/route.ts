import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedSupabaseUser } from "@/lib/supabase-request-auth";

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedSupabaseUser(req);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized. Please log in.",
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const orderId = String(body.orderId || body.id || "").trim();

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing order ID for cancellation.",
        },
        { status: 400 }
      );
    }

    const { data: dbOrder, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select(
        "id, user_id, status, price_usd, supplier, supplier_order_id"
      )
      .eq("id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (orderErr) {
      throw orderErr;
    }

    if (!dbOrder) {
      return NextResponse.json(
        {
          success: false,
          error: "Order not found.",
        },
        { status: 404 }
      );
    }

    const status = String(dbOrder.status || "").toLowerCase();

    /*
     * Never attempt to refund an order that is already terminal.
     */
    if (
      ["canceled", "refunded", "completed", "expired", "banned"].includes(
        status
      )
    ) {
      return NextResponse.json({
        success: true,
        message: "Order is already closed or refunded.",
        status: dbOrder.status,
        refundedAmountUSD: 0,
      });
    }

    const supplierOrderId = String(dbOrder.supplier_order_id || "");

    const fivesimToken =
      process.env.FIVESIM_API_TOKEN || process.env.FIVESIM_API_KEY;

    /*
     * 5SIM cancellation handling.
     *
     * First request cancellation from 5SIM.
     *
     * If 5SIM does not return a successful response, check the actual
     * provider order state before deciding whether a NAVA refund is safe.
     *
     * CANCELED / TIMEOUT:
     *   The supplier activation is already terminal, so NAVA can continue
     *   to its atomic close/refund operation.
     *
     * Anything else:
     *   The activation is still active or the state cannot be confirmed,
     *   so no NAVA refund is issued.
     */
    if (
      dbOrder.supplier === "5sim" &&
      supplierOrderId &&
      fivesimToken &&
      fivesimToken !== "your_5sim_key_here"
    ) {
      const cancelRes = await fetch(
        "https://5sim.net/v1/user/cancel/" +
          encodeURIComponent(supplierOrderId),
        {
          method: "GET",
          headers: {
            Authorization: "Bearer " + fivesimToken,
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      if (!cancelRes.ok) {
        const checkRes = await fetch(
          "https://5sim.net/v1/user/check/" +
            encodeURIComponent(supplierOrderId),
          {
            headers: {
              Authorization: "Bearer " + fivesimToken,
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        if (!checkRes.ok) {
          return NextResponse.json(
            {
              success: false,
              error:
                "5SIM could not confirm the cancellation state. No wallet refund was issued.",
            },
            { status: 502 }
          );
        }

        const checkData = await checkRes.json();

        const providerStatus = String(
          checkData?.status || ""
        ).toUpperCase();

        if (
          providerStatus !== "CANCELED" &&
          providerStatus !== "TIMEOUT"
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                "The 5SIM activation is still active. No wallet refund was issued.",
            },
            { status: 502 }
          );
        }

        /*
         * 5SIM confirms the activation is already terminal.
         * Continue to NAVA's atomic close/refund operation below.
         */
      }
    }

    /*
     * Atomic NAVA close + refund.
     *
     * otp_close_order_atomic() is responsible for:
     *   - validating the order ownership
     *   - locking the order
     *   - preventing duplicate refunds
     *   - crediting the wallet
     *   - changing the order status
     */
    const { data, error } = await supabaseAdmin.rpc(
      "otp_close_order_atomic",
      {
        p_order_id: dbOrder.id,
        p_user_id: user.id,
        p_final_status: "canceled",
      }
    );

    if (error) {
      throw error;
    }

    const result = Array.isArray(data) ? data[0] : data;

    const refundedAmountUSD = Number(
      result?.refunded_amount || 0
    );

    const newBalance = Number(
      result?.new_balance || 0
    );

    const finalStatus = String(
      result?.status || "canceled"
    ).toLowerCase();

    return NextResponse.json({
      success: true,
      message:
        refundedAmountUSD > 0
          ? "Order canceled and refunded successfully."
          : "Order canceled successfully.",
      status: finalStatus,
      refundedAmountUSD,
      newBalance,
    });
  } catch (err: any) {
    console.error("Error during OTP cancellation:", err);

    return NextResponse.json(
      {
        success: false,
        error:
          err?.message || "Unable to process cancellation.",
      },
      { status: 500 }
    );
  }
}