import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedSupabaseUser } from "@/lib/supabase-request-auth";

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedSupabaseUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const { orderId } = await req.json();
    const normalizedOrderId = String(orderId || "").trim();
    if (!normalizedOrderId) {
      return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
    }

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, status, supplier, supplier_order_id")
      .eq("id", normalizedOrderId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (orderErr) throw orderErr;
    if (!order) {
      return NextResponse.json({ error: "Order record not found" }, { status: 404 });
    }

    const status = String(order.status || "").toLowerCase();
    if (["canceled", "refunded", "completed", "expired", "banned"].includes(status)) {
      return NextResponse.json({
        success: true,
        alreadyExpired: status === "expired",
        refundedAmount: 0,
        message: "Order is already " + status,
      });
    }

    const supplierOrderId = String(order.supplier_order_id || "");
    const fivesimToken = process.env.FIVESIM_API_TOKEN || process.env.FIVESIM_API_KEY;
    if (order.supplier === "5sim" && supplierOrderId && fivesimToken && fivesimToken !== "your_5sim_key_here") {
      const apiRes = await fetch("https://5sim.net/v1/user/cancel/" + encodeURIComponent(supplierOrderId), {
        method: "GET",
        headers: {
          Authorization: "Bearer " + fivesimToken,
          Accept: "application/json",
        },
      });
      if (!apiRes.ok) {
        return NextResponse.json(
          { success: false, error: "The supplier could not release this number yet. No wallet refund was issued." },
          { status: 502 }
        );
      }
    }

    const { data, error } = await supabaseAdmin.rpc("otp_close_order_atomic", {
      p_order_id: order.id,
      p_user_id: user.id,
      p_final_status: "expired",
    });
    if (error) throw error;

    const result = Array.isArray(data) ? data[0] : data;
    const refundedAmount = Number(result?.refunded_amount || 0);
    const newBalance = Number(result?.new_balance || 0);

    return NextResponse.json({
      success: true,
      refundedAmount,
      newBalance,
      message: "$" + refundedAmount.toFixed(2) + " automatically refunded to your wallet balance.",
    });
  } catch (err: any) {
    console.error("Error in /api/rentals/expire:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to process auto-refund." },
      { status: 500 }
    );
  }
}