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

    const { orderId } = await req.json();
    const normalizedOrderId = String(orderId || "").trim();

    if (!normalizedOrderId) {
      return NextResponse.json(
        {
          error: "Missing order ID",
        },
        { status: 400 }
      );
    }

    const { data: order, error: orderErr } =
      await supabaseAdmin
        .from("orders")
        .select(
          "id, user_id, status, supplier, supplier_order_id"
        )
        .eq("id", normalizedOrderId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (orderErr) {
      throw orderErr;
    }

    if (!order) {
      return NextResponse.json(
        {
          error: "Order record not found",
        },
        { status: 404 }
      );
    }

    const status = String(
      order.status || ""
    ).toLowerCase();

    /*
     * Terminal NAVA states do not require another supplier
     * cancellation attempt.
     */
    if (
      [
        "canceled",
        "refunded",
        "completed",
        "expired",
        "banned",
      ].includes(status)
    ) {
      return NextResponse.json({
        success: true,
        alreadyExpired:
          status === "expired",
        refundedAmount: 0,
        message:
          "Order is already " + status,
      });
    }

    const supplierOrderId = String(
      order.supplier_order_id || ""
    );

    const fivesimToken =
      process.env.FIVESIM_API_TOKEN ||
      process.env.FIVESIM_API_KEY;

    /*
     * 5SIM supplier handling.
     *
     * Try to cancel first.
     *
     * If the cancel request itself is not successful,
     * check the real supplier order state before deciding
     * whether NAVA may safely issue the refund.
     */
    if (
      order.supplier === "5sim" &&
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
            Authorization:
              "Bearer " + fivesimToken,
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      if (!cancelRes.ok) {
        /*
         * The cancellation endpoint did not confirm success.
         * Ask 5SIM for the actual current state.
         */
        const checkRes = await fetch(
          "https://5sim.net/v1/user/check/" +
            encodeURIComponent(
              supplierOrderId
            ),
          {
            headers: {
              Authorization:
                "Bearer " + fivesimToken,
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

        const checkData =
          await checkRes.json();

        const providerStatus =
          String(
            checkData?.status || ""
          ).toUpperCase();

        /*
         * Only terminal supplier states are safe to
         * send into the NAVA refund operation.
         */
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
         * 5SIM confirms the activation is already
         * terminal, so continue to the NAVA refund.
         */
      }
    }

    /*
     * Atomically:
     *   1. verify ownership
     *   2. lock the order
     *   3. prevent duplicate refunds
     *   4. credit the wallet
     *   5. mark the order expired
     */
    const { data, error } =
      await supabaseAdmin.rpc(
        "otp_close_order_atomic",
        {
          p_order_id: order.id,
          p_user_id: user.id,
          p_final_status: "expired",
        }
      );

    if (error) {
      throw error;
    }

    const result = Array.isArray(data)
      ? data[0]
      : data;

    const refundedAmount =
      Number(
        result?.refunded_amount || 0
      );

    const newBalance =
      Number(
        result?.new_balance || 0
      );

    return NextResponse.json({
      success: true,
      refundedAmount,
      newBalance,
      status:
        result?.status || "expired",
      message:
        refundedAmount > 0
          ? "$" +
            refundedAmount.toFixed(2) +
            " automatically refunded to your wallet balance."
          : "Order expired successfully.",
    });
  } catch (err: any) {
    console.error(
      "Error in /api/rentals/expire:",
      err
    );

    return NextResponse.json(
      {
        error:
          err?.message ||
          "Failed to process auto-refund.",
      },
      { status: 500 }
    );
  }
}