import { NextResponse } from "next/server";

const NGN_PER_USD = 1500; // Baseline dual currency rate

export async function POST(req: Request) {
  try {
    const { userId, email, amountUSD } = await req.json();

    if (!userId || !amountUSD || amountUSD <= 0) {
      return NextResponse.json(
        { error: "Invalid payment parameters." },
        { status: 400 }
      );
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret || paystackSecret === "your_paystack_secret_key_here") {
      return NextResponse.json(
        { error: "Paystack secret key is not configured in server environment." },
        { status: 500 }
      );
    }

    // Convert USD to NGN, then NGN to Kobo (1 NGN = 100 kobo)
    const amountNGN = amountUSD * NGN_PER_USD;
    const amountKobo = Math.round(amountNGN * 100);

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const callbackUrl = `${origin}/dashboard/wallet?paystack=verify`;

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email || "customer@nava.app",
        amount: amountKobo,
        currency: "NGN",
        callback_url: callbackUrl,
        metadata: {
          user_id: userId,
          amount_usd: amountUSD,
          amount_ngn: amountNGN,
        },
      }),
    });

    const paystackData = await paystackRes.json();

    if (!paystackRes.ok || !paystackData.status) {
      return NextResponse.json(
        { error: paystackData.message || "Failed to initialize Paystack checkout." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      authorization_url: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
    });
  } catch (err: any) {
    console.error("Paystack Initialize Error:", err);
    return NextResponse.json(
      { error: err.message || "Server error initializing payment." },
      { status: 500 }
    );
  }
}