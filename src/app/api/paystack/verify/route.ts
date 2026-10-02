import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { reference } = await req.json();

    if (!reference) {
      return NextResponse.json({ error: "Missing payment reference." }, { status: 400 });
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      return NextResponse.json({ error: "Paystack key unconfigured." }, { status: 500 });
    }

    // 1. Verify transaction with Paystack official API
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
      },
    });

    const verifyData = await verifyRes.json();

    if (!verifyRes.ok || !verifyData.status || verifyData.data.status !== "success") {
      return NextResponse.json(
        { error: verifyData.message || "Payment verification failed or pending." },
        { status: 400 }
      );
    }

    const txData = verifyData.data;
    const metadata = txData.metadata || {};
    const userId = metadata.user_id;
    const amountUSD = Number(metadata.amount_usd || 0);

    if (!userId || amountUSD <= 0) {
      return NextResponse.json({ error: "Invalid payment metadata." }, { status: 400 });
    }

    // 2. Fetch User Profile
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", userId)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: "User profile not found." }, { status: 404 });
    }

    // 3. Update Balance Safely
    const currentBalance = Number(profile.balance || 0);
    const newBalance = Number((currentBalance + amountUSD).toFixed(2));

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ balance: newBalance })
      .eq("id", userId);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      creditedAmountUSD: amountUSD,
      newBalance,
      message: `🎉 Successfully credited $${amountUSD.toFixed(2)} to your NAVA wallet!`,
    });
  } catch (err: any) {
    console.error("Paystack Verify Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process payment credit." },
      { status: 500 }
    );
  }
}