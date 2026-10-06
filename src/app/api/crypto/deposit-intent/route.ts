import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

type SupportedCoin = "USDT" | "BTC" | "LTC";

function getCoinConfig(coin: string): { coin: SupportedCoin; network: string; address: string } | null {
  const normalized = String(coin || "").trim().toUpperCase();

  if (normalized === "USDT") {
    return {
      coin: "USDT",
      network: "TRC20",
      address: process.env.CRYPTO_USDT_TRX || process.env.CRYPTO_USDT_TRC20 || "",
    };
  }

  if (normalized === "BTC") {
    return {
      coin: "BTC",
      network: "Bitcoin",
      address: process.env.CRYPTO_BTC || "",
    };
  }

  if (normalized === "LTC") {
    return {
      coin: "LTC",
      network: "Litecoin",
      address: process.env.CRYPTO_LTC || "",
    };
  }

  return null;
}

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 }) };
  }

  const accessToken = authHeader.slice(7).trim();

  if (!accessToken) {
    return { error: NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 }) };
  }

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );

  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) {
    return { error: NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 }) };
  }

  return { user, client };
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUser(req);

    if ("error" in auth) {
      return auth.error;
    }

    const { user } = auth;
    const body = await req.json();
    const amountUsd = Number(body.amountUsd);
    const config = getCoinConfig(body.coin);

    if (!config) {
      return NextResponse.json({ error: "Unsupported cryptocurrency." }, { status: 400 });
    }

    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      return NextResponse.json({ error: "Invalid deposit amount." }, { status: 400 });
    }

    if (!config.address) {
      return NextResponse.json(
        { error: `Server configuration error: missing ${config.coin} deposit address.` },
        { status: 500 }
      );
    }

    const normalizedAmount = Number(amountUsd.toFixed(2));

    // Reuse an existing pending intent for the same user/coin/amount when it is still valid.
    const { data: existingIntent, error: existingErr } = await supabaseAdmin
      .from("deposit_intents")
      .select("id, coin, network, expected_amount_usd, destination_address, status, created_at, expires_at")
      .eq("user_id", user.id)
      .eq("coin", config.coin)
      .eq("expected_amount_usd", normalizedAmount)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!existingErr && existingIntent) {
      return NextResponse.json({
        success: true,
        reused: true,
        intent_id: existingIntent.id,
        coin: existingIntent.coin,
        network: existingIntent.network,
        expected_amount_usd: Number(existingIntent.expected_amount_usd),
        destination_address: existingIntent.destination_address,
        created_at: existingIntent.created_at,
        expires_at: existingIntent.expires_at,
      });
    }

    const { data: intent, error: intentErr } = await supabaseAdmin
      .from("deposit_intents")
      .insert({
        user_id: user.id,
        coin: config.coin,
        network: config.network,
        expected_amount_usd: normalizedAmount,
        destination_address: config.address,
        status: "pending",
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id, coin, network, expected_amount_usd, destination_address, status, created_at, expires_at")
      .single();

    if (intentErr || !intent) {
      console.error("Deposit intent creation failed:", intentErr);
      return NextResponse.json(
        { error: "Unable to create a deposit session. No payment should be sent yet." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reused: false,
      intent_id: intent.id,
      coin: intent.coin,
      network: intent.network,
      expected_amount_usd: Number(intent.expected_amount_usd),
      destination_address: intent.destination_address,
      created_at: intent.created_at,
      expires_at: intent.expires_at,
    });
  } catch (err: any) {
    console.error("Deposit intent API error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create deposit session." },
      { status: 500 }
    );
  }
}
