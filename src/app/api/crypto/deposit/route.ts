import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// USDT TRC20 contract address on Tron blockchain
const USDT_TRC20_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

export async function POST(req: Request) {
  try {
    // 1. Get Authorization header from request
    const authHeader = req.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const accessToken = authHeader.substring(7);

    // 2. Create Supabase client with the token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 3. Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }
    const userId = user.id;

    // 4. Parse & Validate Body
    const { amountUsd, coin, txHash } = await req.json();

    if (!amountUsd || !coin || !txHash) {
      return NextResponse.json({ error: "Missing required deposit details" }, { status: 400 });
    }

    if (typeof amountUsd !== "number" || amountUsd <= 0) {
      return NextResponse.json({ error: "Invalid deposit amount." }, { status: 400 });
    }

    const cleanHash = txHash.trim();
    if (cleanHash.length < 10) {
      return NextResponse.json({ error: "Invalid Transaction Hash format." }, { status: 400 });
    }

    // 5. Get Expected Destination Address from Environment (SERVER-SIDE ONLY)
    const expectedAddress = (
      coin.includes("USDT") || coin.includes("TRX") ? process.env.CRYPTO_USDT_TRX :
      coin.includes("BTC") ? process.env.CRYPTO_BTC :
      coin.includes("LTC") ? process.env.CRYPTO_LTC :
      ""
    );

    // 6. Automated On-Chain Verification
    let isVerified = false;
    let verificationDetails = "";

    // ONLY USDT-TRX can be auto-verified (BTC/LTC require manual admin review)
    if (coin.includes("USDT") || coin.includes("TRX")) {
      try {
        const tronRes = await fetch(`https://apilist.tronscanapi.com/api/transaction-info?hash=${cleanHash}`);
        const tronData = await tronRes.json();

        if (tronData && tronData.confirmed && tronData.contractRet === "SUCCESS") {
          const trc20Transfers = tronData.trc20TransferInfo || [];

          // Verify: Correct destination address + Correct USDT TRC20 contract
          const validTransfer = trc20Transfers.find((t: any) => {
            const addressMatch = expectedAddress && t.to_address.toLowerCase() === expectedAddress.toLowerCase();
            const contractMatch = t.contract_addr && t.contract_addr.toLowerCase() === USDT_TRC20_CONTRACT.toLowerCase();
            return addressMatch && contractMatch;
          });

          if (validTransfer) {
            // Verify amount (TronScan returns amount in SUN/decimals)
            const sentAmount = Number(validTransfer.amount) / 1000000;
            const amountMatch = Math.abs(sentAmount - amountUsd) < 0.01; // $0.01 tolerance

            if (amountMatch) {
              isVerified = true;
              verificationDetails = `TronScan Confirmed + Address Match + USDT Contract + Amount: ${sentAmount}`;
            } else {
              return NextResponse.json({
                error: `Amount mismatch. Sent: ${sentAmount} USDT, Expected: ${amountUsd} USD (±$0.01 tolerance)`
              }, { status: 400 });
            }
          } else if (!expectedAddress) {
            return NextResponse.json({ error: "Server configuration error: Missing USDT address" }, { status: 500 });
          } else {
            return NextResponse.json({
              error: "Transaction is not a USDT TRC20 transfer to the correct destination address."
            }, { status: 400 });
          }
        } else {
          return NextResponse.json({ error: "Transaction not confirmed on Tron blockchain." }, { status: 400 });
        }
      } catch (err) {
        console.warn("Tronscan verification failed:", err);
        return NextResponse.json({ error: "Blockchain verification failed. Please try again." }, { status: 500 });
      }
    } else if (coin.includes("BTC") || coin.includes("Bitcoin")) {
      // BTC: Verify tx exists but NEVER auto-credit (requires manual admin review)
      try {
        const btcRes = await fetch(`https://api.blockchair.com/bitcoin/dashboards/transaction/${cleanHash}`);
        const btcData = await btcRes.json();

        if (btcData?.data?.[cleanHash]?.transaction) {
          isVerified = false; // Force pending for manual review
          verificationDetails = "BTC transaction found - requires manual admin verification";
        } else {
          return NextResponse.json({ error: "Transaction not found on Bitcoin blockchain." }, { status: 400 });
        }
      } catch (err) {
        console.warn("Bitcoin verification failed:", err);
        return NextResponse.json({ error: "Blockchain verification failed. Please try again." }, { status: 500 });
      }
    } else if (coin.includes("LTC") || coin.includes("Litecoin")) {
      // LTC: Verify tx exists but NEVER auto-credit (requires manual admin review)
      try {
        const ltcRes = await fetch(`https://api.blockchair.com/litecoin/dashboards/transaction/${cleanHash}`);
        const ltcData = await ltcRes.json();

        if (ltcData?.data?.[cleanHash]?.transaction) {
          isVerified = false; // Force pending for manual review
          verificationDetails = "LTC transaction found - requires manual admin verification";
        } else {
          return NextResponse.json({ error: "Transaction not found on Litecoin blockchain." }, { status: 400 });
        }
      } catch (err) {
        console.warn("Litecoin verification failed:", err);
        return NextResponse.json({ error: "Blockchain verification failed. Please try again." }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: "Unsupported cryptocurrency." }, { status: 400 });
    }

    const finalStatus = isVerified ? "completed" : "pending";

    // 7. Save Transaction Record (DB UNIQUE constraint prevents duplicates)
    try {
      const { data: newTx, error: txErr } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          amount_usd: Number(amountUsd),
          amount_local: Number(amountUsd) * 1500,
          currency: "USD",
          payment_method: `Crypto - ${coin}`,
          reference: cleanHash,
          status: finalStatus,
        })
        .select()
        .single();

      if (txErr) {
        // Check for UNIQUE constraint violation (duplicate TxHash)
        if (txErr.code === "23505") {
          return NextResponse.json(
            { error: "This Transaction Hash has already been processed." },
            { status: 400 }
          );
        }
        throw txErr;
      }

      // 8. Auto-Credit Wallet ONLY if Verified (USDT-TRX only)
      if (isVerified) {
        // Use atomic RPC function (prevents race conditions)
        const { data: newBalance, error: balanceErr } = await supabase
          .rpc("add_balance_atomic", {
            amount_to_add: Number(amountUsd),
          });

        if (balanceErr) {
          console.error("Balance update failed:", balanceErr);
          // Transaction saved but credit failed - admin can manually fix
          return NextResponse.json({
            success: true,
            autoCredited: false,
            message: "Deposit recorded but auto-credit failed. Contact support for manual credit.",
          });
        }

        return NextResponse.json({
          success: true,
          autoCredited: true,
          newBalance: Number(newBalance),
          message: `⚡ Payment verified on-chain! $${Number(amountUsd).toFixed(2)} added to your wallet instantly.`,
        });
      }

      // BTC/LTC: Pending manual admin review
      return NextResponse.json({
        success: true,
        autoCredited: false,
        message: `${coin} deposit submitted! Your transaction requires manual admin verification (15-60 min). You will be credited once verified.`,
      });

    } catch (dbErr: any) {
      console.error("Database error:", dbErr);
      return NextResponse.json({ error: "Failed to record transaction. Please contact support." }, { status: 500 });
    }

  } catch (err: any) {
    console.error("Deposit API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}