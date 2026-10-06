import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function getAdminAuth(req: Request) {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return {
      error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }

  const accessToken = authHeader.slice(7).trim();
  if (!accessToken) {
    return {
      error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
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
      error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileErr || profile?.role !== "admin") {
    return {
      error: NextResponse.json({ error: "Admin access required." }, { status: 403 }),
    };
  }

  return { client, user };
}

export async function GET(req: Request) {
  try {
    const auth = await getAdminAuth(req);
    if ("error" in auth) return auth.error;

    const { data, error } = await supabaseAdmin
      .from("crypto_payment_recoveries")
      .select(
        "id, user_id, user_email, deposit_intent_id, coin, network, destination_address, tx_hash, claimed_amount_usd, reason, notes, status, verified_amount_usd, verified_block_timestamp, verification_notes, transaction_id, reviewed_by, reviewed_at, created_at, deposit_intents(status, expected_amount_usd, created_at, expires_at)"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Admin crypto recovery lookup failed:", error);
      return NextResponse.json(
        { error: "Unable to load crypto payment recovery reports." },
        { status: 500 }
      );
    }

    return NextResponse.json({ reports: data || [] });
  } catch (err: any) {
    console.error("Admin crypto recovery GET error:", err);
    return NextResponse.json(
      { error: err?.message || "Unable to load crypto recovery reports." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getAdminAuth(req);
    if ("error" in auth) return auth.error;

    const { client } = auth;
    const body = await req.json();
    const action = String(body.action || "").trim().toLowerCase();
    const recoveryId = String(body.recoveryId || "").trim();

    if (!recoveryId) {
      return NextResponse.json(
        { error: "Missing recovery report ID." },
        { status: 400 }
      );
    }

    if (action === "reject") {
      const reason = String(body.reason || "").trim().slice(0, 2000);

      const { error } = await client.rpc("admin_reject_crypto_recovery_atomic", {
        p_recovery_id: recoveryId,
        p_rejection_reason: reason || "Rejected after admin review.",
      });

      if (error) {
        console.error("Crypto recovery rejection failed:", error);
        return NextResponse.json(
          { error: error.message || "Unable to reject recovery report." },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Crypto payment recovery report rejected.",
      });
    }

    if (action === "approve") {
      const verifiedAmountUsd = Number(body.verifiedAmountUsd);
      const verifiedBlockTimestamp = body.verifiedBlockTimestamp
        ? String(body.verifiedBlockTimestamp)
        : null;
      const verificationNotes = String(body.verificationNotes || "").trim().slice(0, 2000);

      if (!Number.isFinite(verifiedAmountUsd) || verifiedAmountUsd <= 0) {
        return NextResponse.json(
          { error: "A verified on-chain amount is required." },
          { status: 400 }
        );
      }

      if (!verificationNotes) {
        return NextResponse.json(
          { error: "Enter verification notes describing the blockchain check." },
          { status: 400 }
        );
      }

      const { data: newBalance, error } = await client.rpc(
        "admin_complete_crypto_recovery_atomic",
        {
          p_recovery_id: recoveryId,
          p_verified_amount_usd: verifiedAmountUsd,
          p_verified_block_timestamp: verifiedBlockTimestamp,
          p_verification_notes: verificationNotes,
        }
      );

      if (error) {
        console.error("Crypto recovery approval failed:", error);
        return NextResponse.json(
          { error: error.message || "Unable to approve crypto recovery." },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        newBalance: Number(newBalance),
        message: "Crypto payment verified and wallet credited atomically.",
      });
    }

    return NextResponse.json(
      { error: "Unsupported recovery action." },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("Admin crypto recovery POST error:", err);
    return NextResponse.json(
      { error: err?.message || "Unable to process crypto recovery." },
      { status: 500 }
    );
  }
}
