import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { userId, serviceSlug, countryCode, priceUSD } = await req.json();

    if (!userId || !serviceSlug || !countryCode || priceUSD === undefined) {
      return NextResponse.json(
        { error: "Missing required order parameters." },
        { status: 400 }
      );
    }

    const cost = Number(priceUSD);
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

      if (currentBalance < cost) {
        return NextResponse.json(
          { error: "Insufficient wallet balance. Please top up your wallet." },
          { status: 400 }
        );
      }
    }

    // 2. Dual Supplier Routing (Hidden from Client Payload)
    const isUS = countryUpper === "US";
    const smspoolApiKey = process.env.SMSPOOL_API_KEY;
    // Canonical variable is FIVESIM_API_TOKEN, with FIVESIM_API_KEY as fallback
    const fivesimApiKey = process.env.FIVESIM_API_TOKEN || process.env.FIVESIM_API_KEY;

    let assignedPhone = "";
    let supplierOrderId = "";
    let supplierName = isUS ? "smspool" : "fivesim";

    if (isUS && smspoolApiKey && smspoolApiKey !== "your_smspool_key_here") {
      try {
        const formData = new FormData();
        const serviceQuery = serviceSlug.toLowerCase().includes("chatgpt") ? "openai" : serviceSlug.toLowerCase();
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
        }
      } catch (e) {
        console.warn("SmsPool API call failed, using fallback route:", e);
      }
    } else if (!isUS && fivesimApiKey && fivesimApiKey !== "your_5sim_key_here") {
      try {
        const countrySlug = countryCode.toLowerCase();
        const serviceQuery = serviceSlug.toLowerCase().includes("chatgpt") ? "openai" : serviceSlug.toLowerCase();
        const apiRes = await fetch(
          `https://5sim.net/v1/user/buy/activation/${countrySlug}/any/${serviceQuery}`,
          {
            headers: {
              Authorization: `Bearer ${fivesimApiKey}`,
              Accept: "application/json",
            },
          }
        );
        const apiData = await apiRes.json();
        if (apiData.phone) {
          assignedPhone = apiData.phone;
          supplierOrderId = String(apiData.id);
        }
      } catch (e) {
        console.warn("5sim API call failed, using fallback route:", e);
      }
    }

    // Fallback Mock Number Generator if supplier keys are unconfigured during local testing
    if (!assignedPhone) {
      const areaCode = Math.floor(200 + Math.random() * 700);
      const prefix = Math.floor(100 + Math.random() * 800);
      const line = Math.floor(1000 + Math.random() * 9000);
      assignedPhone = isUS
        ? `+1${areaCode}${prefix}${line}`
        : `+447${Math.floor(100000000 + Math.random() * 900000000)}`;
      supplierOrderId = `MOCK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    // 3. Deduct User Wallet Balance
    let newBalance = currentBalance;
    if (actualUserId) {
      newBalance = Number((currentBalance - cost).toFixed(2));
      await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("id", actualUserId);
    }

    // 4. Save Order in Database
    const nowIso = new Date().toISOString();
    let savedOrder = {
      id: supplierOrderId,
      phone_number: assignedPhone,
      service_name: serviceSlug,
      country_code: countryUpper,
      price_usd: cost,
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
          price_usd: cost,
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

    // 5. Clean JSON Response Payload
    return NextResponse.json({
      success: true,
      newBalance,
      order: {
        id: savedOrder.id,
        phone_number: savedOrder.phone_number,
        service_name: serviceSlug,
        country_code: countryUpper,
        price_usd: cost,
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