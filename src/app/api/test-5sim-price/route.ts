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

    // 3. Read canonical token (optional for guest prices, included for auth validation)
    const fivesimToken = process.env.FIVESIM_API_TOKEN || process.env.FIVESIM_API_KEY;

    // 4. READ-ONLY Guest Prices Query for USA / WhatsApp (Zero balance deduction)
    const apiRes = await fetch("https://5sim.net/v1/guest/prices?country=usa&product=whatsapp", {
      headers: {
        ...(fivesimToken ? { Authorization: `Bearer ${fivesimToken}` } : {}),
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const apiData = await apiRes.json();

    if (!apiRes.ok) {
      return NextResponse.json(
        { error: "Failed to query 5SIM prices endpoint." },
        { status: apiRes.status }
      );
    }

    // 5. Return sanitized pricing & availability comparison
    return NextResponse.json({
      success: true,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
      navaCatalogPriceUSD: 0.90,
      priceOrigin: "Hardcoded NAVA Catalog (SERVICES_DATA in src/app/dashboard/page.tsx)",
      fivesimLiveQuote: apiData,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Price diagnostic request failed." },
      { status: 500 }
    );
  }
}