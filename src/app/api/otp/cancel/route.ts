import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedSupabaseUser } from "@/lib/supabase-request-auth";

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedSupabaseUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const body = await req.json();
    const orderId = String(body.orderId || body.id || "").trim();
    if (!orderId) {
      return NextResponse.json({ success: false, error: "Missing order ID for cancellation." }, { status: 400 });
    }

    const { data: dbOrder, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, status, price_usd, supplier, supplier_order_id")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (orderErr) throw orderErr;
    if (!dbOrder) {
      return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
    }

    const status = String(dbOrder.status || "").toLowerCase();
    if (["canceled", "refunded", "completed", "expired", "banned"].includes(status)) {
      return NextResponse.json({
        success: true,
        message: "Order is already closed or refunded.",
        status: dbOrder.status,
        refundedAmountUSD: 0,
      });
    }

    const supplierOrderId = String(dbOrder.supplier_order_id || "");
    const fivesimToken = process.env.FIVESIM_API_TOKEN || process.env.FIVESIM_API_KEY;

    if (dbOrder.supplier === "5sim" && supplierOrderId && fivesimToken && fivesimToken !== "your_5sim_key_here") {
      const apiRes = await fetch("https://5sim.net/v1/user/cancel/" + encodeURIComponent(supplierOrderId), {
        method: "GET",
        headers: {
          Authorization: "Bearer " + fivesimToken,
          Accept: "application/json",
        },
      });
      if (!apiRes.ok) {
        return NextResponse.json(
          { success: false, error: "The supplier could not cancel this number yet. No wallet refund was issued." },
          { status: 502 }
        );
      }
    }

    const { data, error } = await supabaseAdmin.rpc("otp_close_order_atomic", {
      p_order_id: dbOrder.id,
      p_user_id: user.id,
      p_final_status: "canceled",
    });

    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;

    return NextResponse.json({
      success: true,
      message: result?.refunded_amount > 0
        ? "Order canceled and refunded successfully."
        : "Order canceled successfully.",
      status: result?.status || "canceled",
      refundedAmountUSD: Number(result?.refunded_amount || 0),
      newBalance: Number(result?.new_balance || 0),
    });
  } catch (err: any) {
    console.error("Error during OTP cancellation:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Unable to process cancellation." },
      { status: 500 }
    );
  }
}