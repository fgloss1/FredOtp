import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

async function getAuthenticatedClient(req: Request) {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }

  const accessToken = authHeader.slice(7).trim();

  if (!accessToken) {
    return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
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
    return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }

  return { client, user };
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedClient(req);

    if ("error" in auth) {
      return auth.error;
    }

    const { client, user } = auth;
    const body = await req.json();
    const transactionId = String(body.transactionId || "").trim();

    if (!transactionId) {
      return NextResponse.json({ error: "Missing transaction ID." }, { status: 400 });
    }

    // The database RPC performs the authoritative admin-role check,
    // transaction/intent locking, balance credit, and status updates atomically.
    const { data: newBalance, error: approveErr } = await client.rpc(
      "admin_complete_deposit_atomic",
      { p_transaction_id: transactionId }
    );

    if (approveErr) {
      console.error("Admin crypto approval failed:", approveErr);
      const status =
        approveErr.message?.includes("Admin access required") ? 403 :
        approveErr.message?.includes("not pending") ||
        approveErr.message?.includes("no deposit intent") ? 400 :
        500;

      return NextResponse.json(
        { error: approveErr.message || "Unable to approve crypto deposit." },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      newBalance: Number(newBalance),
      approvedBy: user.id,
      message: "Transaction approved and wallet credited atomically.",
    });
  } catch (err: any) {
    console.error("Admin crypto approval error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to approve crypto deposit." },
      { status: 500 }
    );
  }
}
