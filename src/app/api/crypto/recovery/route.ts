import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

const SUPPORTED_COINS = new Set(["USDT", "BTC", "LTC"]);
const RECOVERY_REASONS = new Set([
  "late_payment",
  "duplicate_payment",
  "unmatched_payment",
  "other",
]);

function getCoinConfig(coin: string) {
  if (coin === "USDT") {
    return {
      network: "TRC20",
      address: (
        process.env.CRYPTO_USDT_TRX ||
        process.env.CRYPTO_USDT_TRC20 ||
        ""
      ).trim(),
    };
  }

  if (coin === "BTC") {
    return {
      network: "Bitcoin",
      address: (process.env.CRYPTO_BTC || "").trim(),
    };
  }

  if (coin === "LTC") {
    return {
      network: "Litecoin",
      address: (process.env.CRYPTO_LTC || "").trim(),
    };
  }

  return null;
}

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      ),
    };
  }

  const accessToken = authHeader.slice(7).trim();
  if (!accessToken) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      ),
    };
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
    return {
      error: NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      ),
    };
  }

  return { user };
}

export async function GET(req: Request) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) return auth.error;

    const { user } = auth;

    const [{ data: sessions, error: sessionsErr }, { data: reports, error: reportsErr }] =
      await Promise.all([
        supabaseAdmin
          .from("deposit_intents")
          .select(
            "id, coin, network, expected_amount_usd, destination_address, status, created_at, expires_at, completed_at"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabaseAdmin
          .from("crypto_payment_recoveries")
          .select(
            "id, deposit_intent_id, coin, network, tx_hash, claimed_amount_usd, reason, notes, status, verification_notes, created_at, reviewed_at"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

    if (sessionsErr || reportsErr) {
      console.error("Crypto recovery lookup failed:", sessionsErr || reportsErr);
      return NextResponse.json(
        { error: "Unable to load crypto payment recovery information." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessions: sessions || [],
      reports: reports || [],
    });
  } catch (err: any) {
    console.error("Crypto recovery GET error:", err);
    return NextResponse.json(
      { error: err?.message || "Unable to load recovery information." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) return auth.error;

    const { user } = auth;
    const body = await req.json();

    const txHash = String(body.txHash || "").trim();
    const depositIntentId = String(body.depositIntentId || "").trim() || null;
    const reason = String(body.reason || "").trim();
    const notes = String(body.notes || "").trim().slice(0, 2000);

    if (!/^[A-Za-z0-9]{32,200}$/.test(txHash)) {
      return NextResponse.json(
        { error: "Enter a valid blockchain Transaction Hash." },
        { status: 400 }
      );
    }

    if (!RECOVERY_REASONS.has(reason)) {
      return NextResponse.json(
        { error: "Select a valid payment issue type." },
        { status: 400 }
      );
    }

    let coin = String(body.coin || "").trim().toUpperCase();
    let network = "";
    let destinationAddress = "";
    let claimedAmountUsd =
      body.claimedAmountUsd === undefined ||
      body.claimedAmountUsd === null ||
      body.claimedAmountUsd === ""
        ? null
        : Number(body.claimedAmountUsd);

    if (depositIntentId) {
      const { data: intent, error: intentErr } = await supabaseAdmin
        .from("deposit_intents")
        .select(
          "id, user_id, coin, network, expected_amount_usd, destination_address"
        )
        .eq("id", depositIntentId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (intentErr || !intent) {
        return NextResponse.json(
          { error: "The selected deposit session could not be found." },
          { status: 404 }
        );
      }

      coin = String(intent.coin).toUpperCase();
      network = String(intent.network);
      destinationAddress = String(intent.destination_address);

      if (claimedAmountUsd === null) {
        claimedAmountUsd = Number(intent.expected_amount_usd);
      }
    } else {
      if (!SUPPORTED_COINS.has(coin)) {
        return NextResponse.json(
          { error: "Select the cryptocurrency used for the payment." },
          { status: 400 }
        );
      }

      const config = getCoinConfig(coin);
      if (!config || !config.address) {
        return NextResponse.json(
          { error: `Server configuration for ${coin} recovery is unavailable.` },
          { status: 500 }
        );
      }

      network = config.network;
      destinationAddress = config.address;
    }

    if (!SUPPORTED_COINS.has(coin)) {
      return NextResponse.json(
        { error: "Unsupported cryptocurrency." },
        { status: 400 }
      );
    }

    if (
      claimedAmountUsd !== null &&
      (!Number.isFinite(claimedAmountUsd) || claimedAmountUsd <= 0)
    ) {
      return NextResponse.json(
        { error: "Enter a valid claimed payment amount." },
        { status: 400 }
      );
    }

    const [{ data: existingTx, error: existingTxErr }, { data: existingReport, error: existingReportErr }] =
      await Promise.all([
        supabaseAdmin
          .from("transactions")
          .select("id, status")
          .eq("reference", txHash)
          .maybeSingle(),
        supabaseAdmin
          .from("crypto_payment_recoveries")
          .select("id, status")
          .eq("tx_hash", txHash)
          .maybeSingle(),
      ]);

    if (existingTxErr || existingReportErr) {
      console.error(
        "Crypto recovery duplicate lookup failed:",
        existingTxErr || existingReportErr
      );
      return NextResponse.json(
        { error: "Unable to check whether this Transaction Hash was already recorded." },
        { status: 500 }
      );
    }

    if (existingTx) {
      return NextResponse.json(
        { error: "This Transaction Hash has already been recorded in NAVA." },
        { status: 400 }
      );
    }

    if (existingReport) {
      return NextResponse.json(
        { error: "This Transaction Hash has already been reported to NAVA." },
        { status: 400 }
      );
    }

    const { data: report, error: insertErr } = await supabaseAdmin
      .from("crypto_payment_recoveries")
      .insert({
        user_id: user.id,
        user_email: user.email || "Unknown",
        deposit_intent_id: depositIntentId,
        coin,
        network,
        destination_address: destinationAddress,
        tx_hash: txHash,
        claimed_amount_usd: claimedAmountUsd,
        reason,
        notes: notes || null,
        status: "pending",
      })
      .select(
        "id, deposit_intent_id, coin, network, tx_hash, claimed_amount_usd, reason, notes, status, created_at"
      )
      .single();

    if (insertErr || !report) {
      if (insertErr?.code === "23505") {
        return NextResponse.json(
          { error: "This Transaction Hash has already been reported to NAVA." },
          { status: 400 }
        );
      }

      console.error("Crypto recovery report insert failed:", insertErr);
      return NextResponse.json(
        { error: "Unable to submit the crypto payment report." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        report,
        message:
          "Crypto payment report submitted. NAVA support will verify the payment before any wallet credit.",
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Crypto recovery POST error:", err);
    return NextResponse.json(
      { error: err?.message || "Unable to submit crypto payment report." },
      { status: 500 }
    );
  }
}
