import { NextResponse } from "next/server";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { transactions, users, wallets } from "@/db/schema";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedSupabaseUser } from "@/lib/supabase-request-auth";

function navaMonthlyPrice(providerMonthlyCost: number) {
  const markupPercent = Number(process.env.NAVA_PHONE_MARKUP_PERCENT || "80");
  const markup = Number.isFinite(markupPercent) && markupPercent >= 0 ? markupPercent / 100 : 0.8;
  return Number((Math.ceil(providerMonthlyCost * (1 + markup) * 20) / 20).toFixed(2));
}

export async function POST(req: Request) {
  let purchasedProviderNumberId: string | null = null;
  try {
    const authUser = await getAuthenticatedSupabaseUser(req);
    if (!authUser) return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });

    const body = await req.json();
    const phoneNumber = String(body?.phone_number || "").trim();
    const countryCode = String(body?.country_code || "").trim().toUpperCase();
    if (!/^\+[1-9]\d{7,14}$/.test(phoneNumber)) {
      return NextResponse.json({ error: "Please select a valid NAVA Phone number." }, { status: 400 });
    }
    if (!/^[A-Z]{2}$/.test(countryCode)) {
      return NextResponse.json({ error: "Please select a valid NAVA Phone country." }, { status: 400 });
    }

    const apiKey = process.env.TELNYX_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "NAVA Phone number service is temporarily unavailable." }, { status: 503 });

    const exactParams = new URLSearchParams();
    const digits = phoneNumber.replace(/\D/g, "");
    const callingCode = countryCode === "US" || countryCode === "CA" ? "1" : countryCode === "GB" ? "44" : countryCode === "AU" ? "61" : countryCode === "DE" ? "49" : countryCode === "FR" ? "33" : countryCode === "NL" ? "31" : countryCode === "NG" ? "234" : "";
    const nationalNumber = callingCode && digits.startsWith(callingCode) ? digits.slice(callingCode.length) : digits;
    exactParams.set("filter[country_code]", countryCode);
    exactParams.set("filter[phone_number][starts_with]", nationalNumber);
    exactParams.set("filter[limit]", "5");
    exactParams.append("filter[features]", "sms");
    exactParams.set("filter[exclude_held_numbers]", "true");

    const inventoryResponse = await fetch(
      "https://api.telnyx.com/v2/available_phone_numbers?" + exactParams.toString(),
      { headers: { Authorization: "Bearer " + apiKey, Accept: "application/json" }, cache: "no-store" }
    );
    if (!inventoryResponse.ok) {
      console.error("NAVA Phone purchase inventory recheck failed:", inventoryResponse.status);
      return NextResponse.json({ error: "That number is no longer available. Please search again." }, { status: 409 });
    }

    const inventoryPayload = await inventoryResponse.json();
    const candidate = Array.isArray(inventoryPayload?.data)
      ? inventoryPayload.data.find(
          (item: any) =>
            String(item?.phone_number || "").replace(/\D/g, "") === phoneNumber.replace(/\D/g, "")
        )
      : null;
    const providerMonthlyCost = Number(
      candidate?.cost_information?.monthly_cost ??
      candidate?.cost_information?.monthly_fee ??
      candidate?.cost_information?.monthly
    );
    if (!candidate || !Number.isFinite(providerMonthlyCost) || providerMonthlyCost < 0) {
      return NextResponse.json({ error: "That number is no longer available. Please search again." }, { status: 409 });
    }

    const monthlyPrice = navaMonthlyPrice(providerMonthlyCost);
    const purchaseMode = String(process.env.NAVA_PHONE_PURCHASE_MODE || "live").trim().toLowerCase();
    if (purchaseMode === "simulation") {
      return NextResponse.json({
        success: true,
        simulated: true,
        number: {
          id: "simulation-" + phoneNumber.replace(/\D/g, ""),
          phone_number: phoneNumber,
          status: "active",
          country_code: String(candidate?.country_code || "").toUpperCase() || null,
          capabilities: {
            sms: true,
            voice: Array.isArray(candidate?.features)
              ? candidate.features.some((feature: any) =>
                  String(feature?.name || feature || "").toLowerCase() === "voice"
                )
              : false,
          },
          monthly_price: monthlyPrice,
          created_at: new Date().toISOString(),
        },
        message: "Simulation successful. No number was purchased and no wallet was charged.",
      });
    }

    if (purchaseMode !== "live") {
      return NextResponse.json(
        { error: "NAVA Phone checkout is not enabled in this environment. No charge was made." },
        { status: 503 }
      );
    }

    const dbUser = await db.select({ id: users.id }).from(users)
      .where(eq(users.email, authUser.email || "")).limit(1);
    if (!dbUser[0]) {
      return NextResponse.json({ error: "Your NAVA wallet account could not be matched. No charge was made." }, { status: 409 });
    }

    const wallet = await db.select({ id: wallets.id, balance: wallets.balance }).from(wallets)
      .where(eq(wallets.userId, dbUser[0].id)).limit(1);
    if (!wallet[0]) return NextResponse.json({ error: "Your NAVA wallet is not ready yet. No charge was made." }, { status: 409 });
    if (Number(wallet[0].balance) < monthlyPrice) {
      return NextResponse.json(
        { error: "Insufficient wallet balance. You need $" + monthlyPrice.toFixed(2) + " to get this number." },
        { status: 402 }
      );
    }

    const orderResponse = await fetch("https://api.telnyx.com/v2/number_orders", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone_numbers: [{ phone_number: phoneNumber }] }),
    });
    const orderPayload = await orderResponse.json().catch(() => ({}));
    if (!orderResponse.ok) {
      console.error("NAVA Phone purchase order failed:", orderResponse.status, orderPayload);
      return NextResponse.json({ error: "We could not secure that number. Your wallet was not charged." }, { status: 502 });
    }

    const providerNumber = Array.isArray(orderPayload?.data?.phone_numbers)
      ? orderPayload.data.phone_numbers[0]
      : null;
    purchasedProviderNumberId = providerNumber?.id || null;

    const charged = await db.transaction(async (tx) => {
      const updated = await tx.update(wallets).set({
        balance: sql`${wallets.balance} - ${monthlyPrice.toFixed(2)}`,
        updatedAt: new Date(),
      }).where(
        and(eq(wallets.id, wallet[0].id), gte(wallets.balance, monthlyPrice.toFixed(2)))
      ).returning({ id: wallets.id });
      if (updated.length === 0) return false;

      await tx.insert(transactions).values({
        userId: dbUser[0].id,
        walletId: wallet[0].id,
        type: "rental_payment",
        amount: monthlyPrice.toFixed(2),
        status: "completed",
        description: "NAVA Phone number " + phoneNumber,
        reference: orderPayload?.data?.id ? String(orderPayload.data.id) : undefined,
      });
      return true;
    });

    if (!charged) {
      if (purchasedProviderNumberId) {
        await fetch(
          "https://api.telnyx.com/v2/phone_numbers/" + encodeURIComponent(purchasedProviderNumberId),
          { method: "DELETE", headers: { Authorization: "Bearer " + apiKey, Accept: "application/json" } }
        ).catch((releaseError) => console.error("NAVA Phone rollback failed:", releaseError));
      }
      return NextResponse.json({ error: "Your wallet balance changed before checkout completed. No charge was made." }, { status: 409 });
    }

    const { data: phoneRow, error: phoneInsertError } = await supabaseAdmin
      .from("nava_phone_numbers")
      .insert({
        user_id: authUser.id,
        phone_number: phoneNumber,
        telnyx_phone_number_id: purchasedProviderNumberId,
        status: "active",
        country_code: String(candidate?.country_code || "").toUpperCase() || null,
        capabilities: {
          sms: true,
          voice: Array.isArray(candidate?.features)
            ? candidate.features.some((feature: any) =>
                String(feature?.name || feature || "").toLowerCase() === "voice"
              )
            : false,
        },
        monthly_price: monthlyPrice,
      })
      .select("id, phone_number, status, country_code, capabilities, monthly_price, created_at")
      .single();

    if (phoneInsertError) {
      console.error("NAVA Phone ownership record failed:", phoneInsertError);

      await db.transaction(async (tx) => {
        await tx
          .update(wallets)
          .set({
            balance: sql`${wallets.balance} + ${monthlyPrice.toFixed(2)}`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, wallet[0].id));

        await tx.insert(transactions).values({
          userId: dbUser[0].id,
          walletId: wallet[0].id,
          type: "refund",
          amount: monthlyPrice.toFixed(2),
          status: "completed",
          description: "NAVA Phone checkout reversal " + phoneNumber,
          reference: orderPayload?.data?.id ? String(orderPayload.data.id) : undefined,
        });
      });

      if (purchasedProviderNumberId) {
        await fetch(
          "https://api.telnyx.com/v2/phone_numbers/" + encodeURIComponent(purchasedProviderNumberId),
          { method: "DELETE", headers: { Authorization: "Bearer " + apiKey, Accept: "application/json" } }
        ).catch((releaseError) => console.error("NAVA Phone rollback failed:", releaseError));
      }

      return NextResponse.json(
        { error: "We could not finish your NAVA Phone setup. Your wallet charge was reversed." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, number: phoneRow, message: "Your NAVA Phone number is ready." });
  } catch (error) {
    console.error("NAVA Phone purchase error:", error);
    return NextResponse.json({ error: "Unable to complete NAVA Phone checkout." }, { status: 500 });
  }
}
