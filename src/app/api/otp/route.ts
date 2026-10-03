import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { calculateNavaPrice } from "@/lib/pricing";

export async function POST(req: Request) {
  try {
    const { userId, serviceSlug, countryCode, priceUSD } = await req.json();

    if (!userId || !serviceSlug || !countryCode || priceUSD === undefined) {
      return NextResponse.json(
        { error: "Missing required order parameters." },
        { status: 400 }
      );
    }

    const countryUpper = countryCode.toUpperCase();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

    let currentBalance = 0.0;
    let actualUserId: string | null = isUuid ? userId : null;

    // 1. Fetch Profile & Check Wallet Balance
    if (actualUserId) {
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", actualUserId)
        .single();

      if (profileErr || !profile) {
        return NextResponse.json({ error: "User profile not found." }, { status: 404 });
      }

      currentBalance = Number(profile.balance);
    }

    // 2. Provider Routing (5SIM is primary when FIVESIM_API_TOKEN / FIVESIM_API_KEY is present)
    const fivesimToken = process.env.FIVESIM_API_TOKEN || process.env.FIVESIM_API_KEY;
    const smspoolApiKey = process.env.SMSPOOL_API_KEY;

    let assignedPhone = "";
    let supplierOrderId = "";
    let supplierName = "";
    let actualSupplierCost = 0.0;

    const countrySlug = countryCode.toLowerCase();
    const serviceQuery = serviceSlug.toLowerCase().includes("chatgpt") ? "openai" : serviceSlug.toLowerCase();

    if (fivesimToken && fivesimToken !== "your_5sim_key_here") {
      supplierName = "5sim";
      try {
        const apiRes = await fetch(
          `https://5sim.net/v1/user/buy/activation/${countrySlug}/any/${serviceQuery}`,
          {
            headers: {
              Authorization: `Bearer ${fivesimToken}`,
              Accept: "application/json",
            },
          }
        );

        if (apiRes.ok) {
          const apiData = await apiRes.json();
          if (apiData.phone) {
            assignedPhone = apiData.phone;
            supplierOrderId = String(apiData.id);
            actualSupplierCost = Number(apiData.price || 0.85);
          }
        }
      } catch (e) {
        console.warn("5SIM API purchase call failed:", e);
      }
    } else if (countryUpper === "US" && smspoolApiKey && smspoolApiKey !== "your_smspool_key_here") {
      supplierName = "smspool";
      try {
        const formData = new FormData();
        formData.append("key", smspoolApiKey);
        formData.append("country", "US");
        formData.append("service", serviceQuery);

        const apiRes = await fetch("https://api.smspool.net/purchase/sms", {
          method: "POST",
          body: formData,
        });
        const apiData = await apiRes.json();

        if (apiData.success === 1 || apiData.phonenumber) {
          assignedPhone = apiData.cc ? `+${apiData.cc}${apiData.phonenumber}` : `+1${apiData.phonenumber}`;
          supplierOrderId = String(apiData.order_id);
          actualSupplierCost = Number(apiData.cost || 0.85);
        }
      } catch (e) {
        console.warn("SmsPool API purchase call failed:", e);
      }
    }

    // 3. FAIL-SAFE: If a provider is configured but purchase failed, DO NOT fall back to mock numbers
    const isProviderConfigured = Boolean(fivesimToken || smspoolApiKey);

    if (isProviderConfigured && !assignedPhone) {
      return NextResponse.json(
        { error: "Provider currently has no available lines for this service/country. Wallet was not charged." },
        { status: 503 }
      );
    }

    // Fallback Mock Number Generator ONLY for unconfigured local dev environments
    if (!assignedPhone) {
      supplierName = "mock";
      const areaCode = Math.floor(200 + Math.random() * 700);
      const prefix = Math.floor(100 + Math.random() * 800);
      const line = Math.floor(1000 + Math.random() * 9000);
      assignedPhone = countryUpper === "US"
        ? `+1${areaCode}${prefix}${line}`
        : `+447${Math.floor(100000000 + Math.random() * 900000000)}`;
      supplierOrderId = `MOCK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      actualSupplierCost = Number(priceUSD) / 1.5;
    }

    // 4. Calculate exact NAVA customer price from supplier cost using single pricing engine
    const pricingResult = calculateNavaPrice(
      actualSupplierCost > 0 ? actualSupplierCost : Number(priceUSD) / 1.5,
      serviceSlug,
      countryCode
    );

    const finalChargedPrice = pricingResult.retailPriceUSD > 0 ? pricingResult.retailPriceUSD : Number(priceUSD);

    // Check user balance against exact calculated retail price
    if (actualUserId && currentBalance < finalChargedPrice) {
      return NextResponse.json(
        {
          error: `Insufficient wallet balance ($${currentBalance.toFixed(2)} available, $${finalChargedPrice.toFixed(
            2
          )} required). Please top up.`,
        },
        { status: 400 }
      );
    }

    // 5. Deduct User Wallet Balance
    let newBalance = currentBalance;
    if (actualUserId) {
      newBalance = Number((currentBalance - finalChargedPrice).toFixed(2));
      await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("id", actualUserId);
    }

    // 6. Save Order in Database
    const nowIso = new Date().toISOString();
    let savedOrder = {
      id: supplierOrderId,
      phone_number: assignedPhone,
      service_name: serviceSlug,
      country_code: countryUpper,
      price_usd: finalChargedPrice,
      status: "Waiting for SMS...",
      created_at: nowIso,
    };

    if (actualUserId) {
      const { data: dbOrder, error: dbErr } = await supabase
        .from("orders")
        .insert({
          user_id: actualUserId,
          service_name: serviceSlug,
          country_code: countryUpper,
          phone_number: assignedPhone,
          price_usd: finalChargedPrice,
          status: "Waiting for SMS...",
          supplier: supplierName,
          supplier_order_id: supplierOrderId,
        })
        .select()
        .single();

      if (!dbErr && dbOrder) {
        savedOrder = dbOrder;
      }
    }

    // 7. Clean JSON Response Payload
    return NextResponse.json({
      success: true,
      newBalance,
      order: {
        id: savedOrder.id,
        phone_number: savedOrder.phone_number,
        service_name: serviceSlug,
        country_code: countryUpper,
        price_usd: finalChargedPrice,
        status: "Waiting for SMS...",
        created_at: savedOrder.created_at || nowIso,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process rental request." },
      { status: 500 }
    );
  }
}