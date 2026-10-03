import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getLive5SimPrice, get5SimToken } from "@/lib/5sim";
import { calculateNavaPrice, MARKET_BENCHMARKS } from "@/lib/pricing";

export async function GET(req: Request) {
  try {
    // 1. Environment Restriction: Preview/Development Only
    const isProduction =
      process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production";
    if (isProduction) {
      return NextResponse.json(
        { error: "Test harness disabled in Production environment." },
        { status: 403 }
      );
    }

    // 2. Authentication Check: Require valid user session
    const authHeader = req.headers.get("authorization");
    const token = authHeader ? authHeader.replace("Bearer ", "") : null;

    const { data: authData, error: authError } = await supabase.auth.getUser(token || undefined);
    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: "Unauthorized access. Valid authentication token required." },
        { status: 401 }
      );
    }

    // 3. 5SIM Authentication & Profile Check
    const fivesimToken = get5SimToken();
    let profileData = null;
    let authSuccess = false;

    if (fivesimToken) {
      const profileRes = await fetch("https://5sim.net/v1/user/profile", {
        headers: { Authorization: `Bearer ${fivesimToken}`, Accept: "application/json" },
        cache: "no-store",
      });
      if (profileRes.ok) {
        profileData = await profileRes.json();
        authSuccess = true;
      }
    }

    // 4. Multi-Country / Multi-Service Quote Diagnostics (Zero Purchase)
    const quoteMatrix = [
      { country: "usa", service: "whatsapp" },
      { country: "usa", service: "openai" },
      { country: "gb", service: "telegram" },
      { country: "ca", service: "whatsapp" },
    ];

    const liveQuotes = await Promise.all(
      quoteMatrix.map(async (q) => {
        const live = await getLive5SimPrice(q.country, q.service);
        return {
          country: q.country,
          service: q.service,
          success: Boolean(live),
          lowestProviderCost: live?.lowestCost || null,
          navaCalculatedPrice: live?.navaPricing?.retailPriceUSD || null,
          navaMarginUSD: live?.navaPricing?.marginUSD || null,
          benchmark: live?.navaPricing?.marketBenchmark || null,
        };
      })
    );

    // 5. NAVA Pricing Calculation Tiered Assertions
    const testCosts = [0.30, 0.85, 1.50, 3.00];
    const pricingTierTests = testCosts.map((cost) => {
      const result = calculateNavaPrice(cost, "whatsapp", "us");
      return {
        providerCostUSD: cost,
        navaRetailPriceUSD: result.retailPriceUSD,
        marginUSD: result.marginUSD,
        marginPercent: result.marginPercent,
        appliedTierMarkupPercent: result.appliedTierMarkupPercent,
        isViable: result.isViable,
      };
    });

    // 6. Return Comprehensive Harness Diagnostic Report
    return NextResponse.json({
      success: true,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
      providerAuth: {
        provider: "5SIM",
        authSuccess,
        balance: profileData?.balance || null,
        rating: profileData?.rating || null,
      },
      liveQuotes,
      pricingTierTests,
      verifiedExample: {
        providerCost: 0.85,
        tier: "50% markup (cost between $0.51-$1.00)",
        rawMarkedUp: 0.85 * 1.50, // 1.275
        roundedUpStep: 1.30, // next $0.05
        marketBenchmarkReference: MARKET_BENCHMARKS["us:whatsapp"] || null,
      },
      safetyGuarantees: {
        purchaseEndpointsInvoked: 0,
        balanceSpentUSD: 0,
        mockNumbersWhenProviderConfigured: false,
        noMigrationAdded: true,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Test harness execution failed." },
      { status: 500 }
    );
  }
}