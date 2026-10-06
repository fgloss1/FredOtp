import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

const USDT_TRC20_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const NGN_PER_USD = 1500;

async function getAuthenticatedClient(req: Request) {
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

  return { client, user };
}

function normalizeCoin(value: unknown): "USDT" | "BTC" | "LTC" | null {
  const coin = String(value || "").trim().toUpperCase();
  if (coin === "USDT") return "USDT";
  if (coin === "BTC" || coin === "BITCOIN") return "BTC";
  if (coin === "LTC" || coin === "LITECOIN") return "LTC";
  return null;
}

function parseTokenAmount(amountRaw: unknown, decimalsRaw: unknown): number | null {
  if (typeof amountRaw !== "string" && typeof amountRaw !== "number") return null;

  const amountText = String(amountRaw);
  if (!/^\d+$/.test(amountText)) return null;

  const decimals = Number(decimalsRaw);
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) return null;

  try {
    const units = BigInt(amountText);
    const value = Number(units) / 10 ** decimals;
    if (!Number.isFinite(value) || value <= 0) return null;
    return value;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedClient(req);

    if ("error" in auth) {
      return auth.error;
    }

    const { client, user } = auth;
    const body = await req.json();
    const intentId = String(body.intentId || "").trim();
    const cleanHash = String(body.txHash || "").trim();

    if (!intentId || !cleanHash || cleanHash.length < 10) {
      return NextResponse.json(
        { error: "Deposit session and Transaction Hash are required." },
        { status: 400 }
      );
    }

    // The authenticated server session is the only source of user identity.
    const { data: intent, error: intentErr } = await supabaseAdmin
      .from("deposit_intents")
      .select("*")
      .eq("id", intentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (intentErr || !intent) {
      return NextResponse.json({ error: "Deposit session not found." }, { status: 404 });
    }

    if (intent.status !== "pending") {
      return NextResponse.json({ error: "This deposit session is no longer pending." }, { status: 400 });
    }

    if (new Date(intent.expires_at).getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "This deposit session has expired. Start a new deposit session." },
        { status: 400 }
      );
    }

    // Global replay protection: the TxHash belongs to NAVA once recorded,
    // regardless of which account submitted it.
    const { data: existingTx, error: existingErr } = await supabaseAdmin
      .from("transactions")
      .select("id, user_id, status")
      .eq("reference", cleanHash)
      .maybeSingle();

    if (existingErr) {
      console.error("Existing transaction lookup failed:", existingErr);
      return NextResponse.json(
        { error: "Unable to verify whether this Transaction Hash was already used." },
        { status: 500 }
      );
    }

    if (existingTx) {
      return NextResponse.json(
        { error: "This Transaction Hash has already been used in NAVA." },
        { status: 400 }
      );
    }

    const coin = normalizeCoin(intent.coin);

    if (!coin) {
      return NextResponse.json({ error: "Unsupported cryptocurrency in deposit session." }, { status: 400 });
    }

    let verifiedAmountUsd: number | null = null;
    let blockTimestamp: string | null = null;
    let manualVerification = false;

    if (coin === "USDT") {
      const expectedAddress = (
        process.env.CRYPTO_USDT_TRX ||
        process.env.CRYPTO_USDT_TRC20 ||
        ""
      ).trim();

      if (!expectedAddress || intent.destination_address.toLowerCase() !== expectedAddress.toLowerCase()) {
        return NextResponse.json(
          { error: "Server configuration changed. Please start a new USDT deposit session." },
          { status: 500 }
        );
      }

      try {
        const tronRes = await fetch(
          `https://apilist.tronscanapi.com/api/transaction-info?hash=${encodeURIComponent(cleanHash)}`,
          { cache: "no-store" }
        );

        if (!tronRes.ok) {
          return NextResponse.json(
            { error: "Blockchain verification failed. Please try again." },
            { status: 502 }
          );
        }

        const tronData = await tronRes.json();

        if (tronData?.confirmed !== true || tronData?.contractRet !== "SUCCESS") {
          return NextResponse.json(
            { error: "Transaction is not confirmed and successful on the Tron blockchain." },
            { status: 400 }
          );
        }

        const timestampRaw = tronData?.timestamp;
        const timestampMs = Number(timestampRaw);

        if (!Number.isFinite(timestampMs) || timestampMs <= 0) {
          return NextResponse.json(
            { error: "Blockchain transaction timestamp could not be verified." },
            { status: 400 }
          );
        }

        blockTimestamp = new Date(timestampMs).toISOString();

        if (new Date(blockTimestamp).getTime() <= new Date(intent.created_at).getTime()) {
          return NextResponse.json(
            {
              error:
                "This transaction occurred before the NAVA deposit session was created and cannot be credited.",
            },
            { status: 400 }
          );
        }

        const transfers = Array.isArray(tronData?.trc20TransferInfo)
          ? tronData.trc20TransferInfo
          : [];

        const matchingTransfers = transfers.filter((transfer: any) => {
          const destinationMatches =
            typeof transfer?.to_address === "string" &&
            transfer.to_address.toLowerCase() === intent.destination_address.toLowerCase();

          const contractMatches =
            typeof transfer?.contract_address === "string" &&
            transfer.contract_address.toLowerCase() === USDT_TRC20_CONTRACT.toLowerCase();

          const tokenType = String(
            transfer?.tokenType || transfer?.tokenType2 || ""
          ).toLowerCase();

          const tokenTypeMatches = !tokenType || tokenType === "trc20";
          const symbolMatches =
            !transfer?.symbol || String(transfer.symbol).toUpperCase() === "USDT";

          return destinationMatches && contractMatches && tokenTypeMatches && symbolMatches;
        });

        if (matchingTransfers.length !== 1) {
          return NextResponse.json(
            {
              error:
                "Transaction does not contain exactly one valid USDT TRC20 payment to the NAVA deposit address.",
            },
            { status: 400 }
          );
        }

        const transfer = matchingTransfers[0];
        verifiedAmountUsd = parseTokenAmount(transfer.amount_str, transfer.decimals);

        if (verifiedAmountUsd === null) {
          return NextResponse.json(
            { error: "Unable to determine the exact on-chain USDT amount." },
            { status: 400 }
          );
        }

        const expectedAmountUsd = Number(intent.expected_amount_usd);

        if (
          !Number.isFinite(expectedAmountUsd) ||
          Math.abs(verifiedAmountUsd - expectedAmountUsd) > 0.01
        ) {
          return NextResponse.json(
            {
              error: `Amount mismatch. Blockchain payment: ${verifiedAmountUsd.toFixed(
                6
              )} USDT; deposit session expected: ${expectedAmountUsd.toFixed(2)} USD (±$0.01).`,
            },
            { status: 400 }
          );
        }
      } catch (err) {
        console.error("TronScan verification failed:", err);
        return NextResponse.json(
          { error: "Blockchain verification failed. Please try again." },
          { status: 502 }
        );
      }
    } else if (coin === "BTC") {
      manualVerification = true;

      try {
        const btcRes = await fetch(
          `https://api.blockchair.com/bitcoin/dashboards/transaction/${encodeURIComponent(cleanHash)}`,
          { cache: "no-store" }
        );
        const btcData = await btcRes.json();

        if (!btcRes.ok || !btcData?.data?.[cleanHash]?.transaction) {
          return NextResponse.json(
            { error: "Transaction not found on Bitcoin blockchain." },
            { status: 400 }
          );
        }
      } catch (err) {
        console.error("Bitcoin verification failed:", err);
        return NextResponse.json(
          { error: "Blockchain verification failed. Please try again." },
          { status: 502 }
        );
      }
    } else if (coin === "LTC") {
      manualVerification = true;

      try {
        const ltcRes = await fetch(
          `https://api.blockchair.com/litecoin/dashboards/transaction/${encodeURIComponent(cleanHash)}`,
          { cache: "no-store" }
        );
        const ltcData = await ltcRes.json();

        if (!ltcRes.ok || !ltcData?.data?.[cleanHash]?.transaction) {
          return NextResponse.json(
            { error: "Transaction not found on Litecoin blockchain." },
            { status: 400 }
          );
        }
      } catch (err) {
        console.error("Litecoin verification failed:", err);
        return NextResponse.json(
          { error: "Blockchain verification failed. Please try again." },
          { status: 502 }
        );
      }
    }

    const transactionAmountUsd =
      verifiedAmountUsd !== null
        ? Number(verifiedAmountUsd.toFixed(2))
        : Number(intent.expected_amount_usd);

    if (!Number.isFinite(transactionAmountUsd) || transactionAmountUsd <= 0) {
      return NextResponse.json({ error: "Invalid deposit amount." }, { status: 400 });
    }

    const { data: newTx, error: txErr } = await client
      .from("transactions")
      .insert({
        user_id: user.id,
        deposit_intent_id: intent.id,
        amount_usd: transactionAmountUsd,
        amount_local: Number((transactionAmountUsd * NGN_PER_USD).toFixed(2)),
        currency: "USD",
        payment_method: `Crypto - ${coin}${coin === "USDT" ? " (TRC20)" : ""}`,
        reference: cleanHash,
        status: "pending",
        block_timestamp: blockTimestamp,
      })
      .select("id")
      .single();

    if (txErr || !newTx) {
      if (txErr?.code === "23505") {
        return NextResponse.json(
          { error: "This Transaction Hash has already been used in NAVA." },
          { status: 400 }
        );
      }

      console.error("Crypto transaction insert failed:", txErr);
      return NextResponse.json(
        { error: "Failed to record the deposit transaction." },
        { status: 500 }
      );
    }

    if (coin === "USDT" && !manualVerification) {
      const { data: newBalance, error: balanceErr } = await client.rpc(
        "complete_deposit_atomic",
        {
          p_intent_id: intent.id,
          p_transaction_id: newTx.id,
        }
      );

      if (balanceErr) {
        console.error("Atomic crypto completion failed:", balanceErr);

        return NextResponse.json(
          {
            success: true,
            autoCredited: false,
            pending: true,
            message:
              "Payment verified and recorded, but automatic wallet credit is temporarily pending admin review.",
          },
          { status: 202 }
        );
      }

      return NextResponse.json({
        success: true,
        autoCredited: true,
        newBalance: Number(newBalance),
        creditedAmountUsd: transactionAmountUsd,
        message: `⚡ Payment verified on-chain! $${transactionAmountUsd.toFixed(
          2
        )} added to your NAVA wallet instantly.`,
      });
    }

    return NextResponse.json({
      success: true,
      autoCredited: false,
      pending: true,
      message: `${coin} deposit recorded. It requires manual admin verification before wallet credit.`,
    });
  } catch (err: any) {
    console.error("Deposit API Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to process deposit." },
      { status: 500 }
    );
  }
}
