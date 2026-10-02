import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
    }

    // 1. Fetch Order Record from Database
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Order record not found" }, { status: 404 });
    }

    // 2. Prevent Double Refunds if already completed or expired
    if (order.status === "Completed") {
      return NextResponse.json(
        { error: "Cannot refund a completed order with received SMS code." },
        { status: 400 }
      );
    }

    if (order.status === "Expired" || order.status === "Cancelled") {
      return NextResponse.json(
        { error: `Order is already ${order.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // 3. Fetch User Profile Balance
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", order.user_id)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const currentBalance = Number(profile.balance);
    const refundAmount = Number(order.price_usd);
    const newBalance = Number((currentBalance + refundAmount).toFixed(2));

    // 4. Update Profile Balance & Mark Order Expired
    const { error: updateBalErr } = await supabase
      .from("profiles")
      .update({ balance: newBalance })
      .eq("id", order.user_id);

    if (updateBalErr) throw updateBalErr;

    const { error: updateOrderErr } = await supabase
      .from("orders")
      .update({ status: "Expired" })
      .eq("id", orderId);

    if (updateOrderErr) throw updateOrderErr;

    return NextResponse.json({
      success: true,
      refundedAmount: refundAmount,
      newBalance,
      message: `⚡ 10-Minute timeout reached. $${refundAmount.toFixed(2)} automatically refunded to your wallet balance.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process auto-refund." }, { status: 500 });
  }
}