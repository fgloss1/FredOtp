import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { transactionId } = await req.json();

    if (!transactionId) {
      return NextResponse.json({ error: "Missing transaction ID" }, { status: 400 });
    }

    // Get transaction
    const { data: tx, error: txErr } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (txErr || !tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (tx.status === "completed") {
      return NextResponse.json({ error: "Transaction is already completed" }, { status: 400 });
    }

    // Get current profile balance
    const { data: profile } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", tx.user_id)
      .single();

    const currentBalance = profile ? Number(profile.balance) : 0;
    const newBalance = Number((currentBalance + Number(tx.amount_usd)).toFixed(2));

    // Update profile balance
    const { error: balanceErr } = await supabase
      .from("profiles")
      .update({ balance: newBalance })
      .eq("id", tx.user_id);

    if (balanceErr) throw balanceErr;

    // Mark transaction as completed
    await supabase
      .from("transactions")
      .update({ status: "completed" })
      .eq("id", transactionId);

    return NextResponse.json({
      success: true,
      newBalance,
      message: "Transaction approved and wallet credited successfully!",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}