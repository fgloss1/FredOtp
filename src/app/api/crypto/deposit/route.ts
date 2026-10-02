import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { userId, amountUsd, coin, txHash } = await req.json();

    if (!userId || !amountUsd || !coin || !txHash) {
      return NextResponse.json({ error: "Missing required deposit details" }, { status: 400 });
    }

    const cleanHash = txHash.trim();

    // 1. Prevent TxHash Replay Attacks
    const { data: existingTx } = await supabase
      .from("transactions")
      .select("id")
      .eq("reference", cleanHash)
      .single();

    if (existingTx) {
      return NextResponse.json(
        { error: "This Transaction Hash has already been processed." },
        { status: 400 }
      );
    }

    // 2. Automated On-Chain Verification
    let isVerified = false;

    if (coin.includes("TRX") || coin.includes("TRC20") || coin.includes("USDT")) {
      try {
        const tronRes = await fetch(`https://apilist.tronscanapi.com/api/transaction-info?hash=${cleanHash}`);
        const tronData = await tronRes.json();

        if (tronData && tronData.confirmed && tronData.contractRet === "SUCCESS") {
          const destinationAddr = process.env.CRYPTO_USDT_TRX || process.env.CRYPTO_USDT_TRC20 || "";
          const trc20Transfers = tronData.trc20TransferInfo || [];

          const validTransfer = trc20Transfers.find(
            (t: any) => t.to_address.toLowerCase() === destinationAddr.toLowerCase()
          );

          if (validTransfer || destinationAddr === "") {
            isVerified = true;
          }
        }
      } catch (err) {
        console.warn("Tronscan verification check skipped:", err);
      }
    } else if (coin.includes("BTC") || coin.includes("Bitcoin")) {
      try {
        const btcRes = await fetch(`https://api.blockchair.com/bitcoin/dashboards/transaction/${cleanHash}`);
        const btcData = await btcRes.json();

        if (btcData?.data?.[cleanHash]?.transaction) {
          isVerified = true;
        }
      } catch (err) {
        console.warn("Bitcoin verification check skipped:", err);
      }
    } else if (coin.includes("LTC") || coin.includes("Litecoin")) {
      try {
        const ltcRes = await fetch(`https://api.blockchair.com/litecoin/dashboards/transaction/${cleanHash}`);
        const ltcData = await ltcRes.json();

        if (ltcData?.data?.[cleanHash]?.transaction) {
          isVerified = true;
        }
      } catch (err) {
        console.warn("Litecoin verification check skipped:", err);
      }
    }

    const finalStatus = isVerified ? "completed" : "pending";

    // 3. Save Transaction
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

    if (txErr) throw txErr;

    // 4. Auto-credit wallet if verified on-chain
    if (isVerified) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", userId)
        .single();

      const currentBalance = profile ? Number(profile.balance) : 0;
      const newBalance = Number((currentBalance + Number(amountUsd)).toFixed(2));

      await supabase.from("profiles").update({ balance: newBalance }).eq("id", userId);

      return NextResponse.json({
        success: true,
        autoCredited: true,
        newBalance,
        message: `⚡ Payment verified on-chain! $${Number(amountUsd).toFixed(2)} added to your wallet instantly.`,
      });
    }

    return NextResponse.json({
      success: true,
      autoCredited: false,
      message: "Deposit submitted! Your TxHash is queued for automated block confirmation.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}