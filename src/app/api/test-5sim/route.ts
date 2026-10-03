import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    // 1. Environment Restriction: Disabled in Production
    const isProduction =
      process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production";
    if (isProduction) {
      return NextResponse.json(
        { error: "Diagnostic endpoint disabled in Production environment." },
        { status: 403 }
      );
    }

    // 2. Authentication Check: Require valid user session
    const authHeader = req.headers.get("authorization");
    const token = authHeader ? authHeader.replace("Bearer ", "") : null;

    const { data, error: authError } = await supabase.auth.getUser(token || undefined);
    if (authError || !data?.user) {
      return NextResponse.json(
        { error: "Unauthorized access. Valid authentication required." },
        { status: 401 }
      );
    }

    // 3. Read canonical token with fallback
    const fivesimToken = process.env.FIVESIM_API_TOKEN || process.env.FIVESIM_API_KEY;

    if (!fivesimToken || fivesimToken === "your_5sim_key_here") {
      return NextResponse.json(
        { error: "5SIM API token is unconfigured on server." },
        { status: 500 }
      );
    }

    // 4. Strict READ-ONLY Profile fetch (Zero cost, no purchases)
    const apiRes = await fetch("https://5sim.net/v1/user/profile", {
      headers: {
        Authorization: `Bearer ${fivesimToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const apiData = await apiRes.json();

    if (!apiRes.ok) {
      return NextResponse.json(
        { error: apiData.message || "Failed to query 5SIM profile." },
        { status: apiRes.status }
      );
    }

    // 5. Return sanitized, non-sensitive profile payload
    return NextResponse.json({
      success: true,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
      profile: {
        email: apiData.email,
        balance: apiData.balance,
        rating: apiData.rating,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Diagnostic request failed." },
      { status: 500 }
    );
  }
}