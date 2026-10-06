import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { calculateNavaPrice } from "@/lib/pricing";

async function getAuthenticatedUser(req: Request) {
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

  const { data: { user }, error } = await client.auth.getUser();

  if (error || !user) {
    return { error: NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 }) };
  }

  return { user };
}

async function cancelSupplierOrder(supplier: string, supplierOrderId: string) {
  if (!supplierOrderId || supplierOrderId.startsWith("MOCK-")) return;

  const fivesimToken = process.env.FIVESIM_API_TOKEN || process.env.FIVESIM_API_KEY;

  if (supplier === "5sim" && fivesimToken && fivesimToken !== "your_5sim_key_here") {
    try {
      await fetch(`https://5sim.net/v1/user/cancel/${encodeURIComponent(supplierOrderId)}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${fivesimToken}`,
          Accept: "application/json",
        },
      });
    } catch (error) {
      console.warn("5SIM cancellation failed after NAVA purchase rollback:", error);
    }
  }
}

async function adjustOtpBalance(userId: string, delta: number) {
  const { data, error } = await supabaseAdmin.rpc("otp_balance_adjust_atomic", {
    p_user_id: userId,
    p_delta: delta,
  });

  if (error) throw error;

  return Number(data);
}

export async function GET(req: Request) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId")?.trim();

    if (!orderId) {
      return NextResponse.json({ error: "Missing order ID." }, { status: 400 });
    }

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, service_name, country_code, phone_number, price_usd, status, supplier, supplier_order_id, created_at, sms_code, sms_text")
      .eq("id", orderId)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (orderErr) {
      return NextResponse.json({ error: "Unable to load order status." }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    let status = String(order.status || "pending").toLowerCase();
    let code = order.sms_code || null;
    let sms = order.sms_text || null;
    let expiresAt: string | null = null;

    if (order.supplier === "5sim" && order.supplier_order_id) {
      const fivesimToken = process.env.FIVESIM_API_TOKEN || process.env.FIVESIM_API_KEY;

      if (fivesimToken && fivesimToken !== "your_5sim_key_here") {
        const apiRes = await fetch(
          `https://5sim.net/v1/user/check/${encodeURIComponent(order.supplier_order_id)}`,
          {
            headers: {
              Authorization: `Bearer ${fivesimToken}`,
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        if (apiRes.ok) {
          const apiData = await apiRes.json();
          const providerStatus = String(apiData.status || "").toUpperCase();

          if (providerStatus === "RECEIVED" || providerStatus === "FINISHED") {
            status = "completed";
          } else if (providerStatus === "CANCELED") {
            status = "canceled";
          } else if (providerStatus === "BANNED") {
            status = "banned";
          } else if (providerStatus === "TIMEOUT") {
            status = "expired";
          } else if (providerStatus === "PENDING") {
            status = "pending";
          }

          const smsEntry = Array.isArray(apiData.sms) && apiData.sms.length > 0 ? apiData.sms[apiData.sms.length - 1] : null;
          code = smsEntry?.code || apiData.code || code;
          sms = smsEntry?.text || apiData.sms_text || sms;
          expiresAt = apiData.expires || null;

          const shouldPersist = status !== String(order.status || "").toLowerCase() || code !== order.sms_code || sms !== order.sms_text;

          if (shouldPersist) {
            const update: Record<string, string | null> = {
              status,
              sms_code: code,
              sms_text: sms,
            };

            await supabaseAdmin.from("orders").update(update).eq("id", order.id);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      id: order.id,
      orderId: order.id,
      supplier_order_id: order.supplier_order_id,
      number: order.phone_number,
      phone_number: order.phone_number,
      service: order.service_name,
      service_name: order.service_name,
      country: order.country_code,
      country_code: order.country_code,
      price_usd: Number(order.price_usd || 0),
      status,
      code,
      sms_code: code,
      sms,
      sms_text: sms,
      expires_at: expiresAt || order.created_at
        ? (expiresAt || new Date(new Date(order.created_at).getTime() + 15 * 60_000).toISOString())
        : null,
      created_at: order.created_at,
    });
  } catch (err: any) {
    console.error("OTP status error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load order status." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  let chargedUserId: string | null = null;
  let chargedAmount = 0;
  let supplierName = "";
  let supplierOrderId = "";

  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) return auth.error;

    const { user } = auth;
    chargedUserId = user.id;

    const body = await req.json();
    const serviceSlug = String(body.serviceSlug || body.service || "").trim().toLowerCase();
    const countryCode = String(body.countryCode || body.country || "").trim();
    const priceUSD = Number(body.priceUSD);

    if (!serviceSlug || !countryCode || !Number.isFinite(priceUSD) || priceUSD <= 0) {
      return NextResponse.json(
        { error: "Missing or invalid order parameters." },
        { status: 400 }
      );
    }

    const countryUpper = countryCode.toUpperCase();

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("balance")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: "User profile not found." }, { status: 404 });
    }

    const currentBalance = Number(profile.balance || 0);

    const fivesimToken = process.env.FIVESIM_API_TOKEN || process.env.FIVESIM_API_KEY;
    const smspoolApiKey = process.env.SMSPOOL_API_KEY;

    let assignedPhone = "";
    let actualSupplierCost = 0;

    const countrySlug = countryCode.toLowerCase();
    const serviceQuery = serviceSlug.includes("chatgpt") ? "openai" : serviceSlug;

    if (fivesimToken && fivesimToken !== "your_5sim_key_here") {
      supplierName = "5sim";

      try {
        const apiRes = await fetch(
          `https://5sim.net/v1/user/buy/activation/${encodeURIComponent(countrySlug)}/any/${encodeURIComponent(serviceQuery)}`,
          {
            headers: {
              Authorization: `Bearer ${fivesimToken}`,
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        if (apiRes.ok) {
          const apiData = await apiRes.json();

          if (apiData.phone) {
            assignedPhone = String(apiData.phone);
            supplierOrderId = String(apiData.id);
            actualSupplierCost = Number(apiData.price || 0);
          }
        } else {
          console.warn("5SIM purchase failed:", await apiRes.text().catch(() => ""));
        }
      } catch (error) {
        console.warn("5SIM API purchase call failed:", error);
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
          assignedPhone = apiData.cc
            ? `+${apiData.cc}${apiData.phonenumber}`
            : `+1${apiData.phonenumber}`;
          supplierOrderId = String(apiData.order_id);
          actualSupplierCost = Number(apiData.cost || 0);
        }
      } catch (error) {
        console.warn("SmsPool API purchase call failed:", error);
      }
    }

    const isProviderConfigured = Boolean(fivesimToken || smspoolApiKey);

    if (isProviderConfigured && !assignedPhone) {
      return NextResponse.json(
        {
          error: "Provider currently has no available lines for this service/country. Wallet was not charged.",
        },
        { status: 503 }
      );
    }

    if (!assignedPhone) {
      supplierName = "mock";
      const areaCode = Math.floor(200 + Math.random() * 700);
      const prefix = Math.floor(100 + Math.random() * 800);
      const line = Math.floor(1000 + Math.random() * 9000);

      assignedPhone = countryUpper === "US"
        ? `+1${areaCode}${prefix}${line}`
        : `+447${Math.floor(100000000 + Math.random() * 900000000)}`;

      supplierOrderId = `MOCK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      actualSupplierCost = priceUSD / 1.5;
    }

    const pricingResult = calculateNavaPrice(
      actualSupplierCost > 0 ? actualSupplierCost : priceUSD / 1.5,
      serviceSlug,
      countryCode
    );

    const finalChargedPrice = pricingResult.retailPriceUSD > 0
      ? pricingResult.retailPriceUSD
      : priceUSD;

    chargedAmount = finalChargedPrice;

    if (currentBalance < finalChargedPrice) {
      await cancelSupplierOrder(supplierName, supplierOrderId);
      return NextResponse.json(
        {
          error: `Insufficient wallet balance ($${currentBalance.toFixed(2)} available, $${finalChargedPrice.toFixed(2)} required). Please top up.`,
        },
        { status: 400 }
      );
    }

    const newBalance = await adjustOtpBalance(user.id, -finalChargedPrice);

    const { data: dbOrder, error: dbErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: user.id,
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

    if (dbErr || !dbOrder) {
      try {
        await adjustOtpBalance(user.id, finalChargedPrice);
      } catch (refundError) {
        console.error("CRITICAL: OTP wallet refund failed after order insert error:", refundError);
      }
      await cancelSupplierOrder(supplierName, supplierOrderId);

      return NextResponse.json(
        { error: "Order could not be recorded. Your wallet charge was rolled back." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      newBalance,
      order: {
        id: dbOrder.id,
        supplier_order_id: supplierOrderId,
        phone_number: assignedPhone,
        service_name: serviceSlug,
        country_code: countryUpper,
        price_usd: finalChargedPrice,
        status: "pending",
        created_at: dbOrder.created_at,
        expires_at: new Date(new Date(dbOrder.created_at).getTime() + 15 * 60_000).toISOString(),
      },
    });
  } catch (err: any) {
    if (chargedUserId && chargedAmount > 0) {
      try {
        await adjustOtpBalance(chargedUserId, chargedAmount);
      } catch (refundError) {
        console.error("CRITICAL: OTP wallet refund failed after purchase error:", refundError);
      }
    }

    if (supplierName && supplierOrderId) {
      await cancelSupplierOrder(supplierName, supplierOrderId);
    }

    console.error("OTP purchase error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to process OTP purchase." },
      { status: 500 }
    );
  }
}
