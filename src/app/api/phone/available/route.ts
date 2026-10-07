import { NextResponse } from "next/server";
import { getAuthenticatedSupabaseUser } from "@/lib/supabase-request-auth";

function navaMonthlyPrice(providerMonthlyCost: number) {
  const markupPercent = Number(process.env.NAVA_PHONE_MARKUP_PERCENT || "80");
  const markup = Number.isFinite(markupPercent) && markupPercent >= 0 ? markupPercent / 100 : 0.8;
  const raw = providerMonthlyCost * (1 + markup);
  return Number((Math.ceil(raw * 20) / 20).toFixed(2));
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedSupabaseUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const country = new URL(req.url).searchParams.get("country")?.trim().toUpperCase();

    if (!country || !/^[A-Z]{2}$/.test(country)) {
      return NextResponse.json({ error: "Please select a valid country." }, { status: 400 });
    }

    const apiKey = process.env.TELNYX_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "NAVA Phone number search is temporarily unavailable." },
        { status: 503 }
      );
    }

    const params = new URLSearchParams();
    params.set("filter[country_code]", country);
    params.append("filter[features]", "sms");
    params.set("filter[limit]", "12");
    params.set("filter[exclude_held_numbers]", "true");

    const response = await fetch(
      `https://api.telnyx.com/v2/available_phone_numbers?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error("NAVA Phone inventory lookup failed:", response.status);
      return NextResponse.json(
        { error: "No numbers are currently available for this selection. Please try again later." },
        { status: 503 }
      );
    }

    const payload = await response.json();
    const rawNumbers = Array.isArray(payload?.data) ? payload.data : [];

    const numbers = rawNumbers
      .map((item: any) => {
        const costInformation = item?.cost_information || {};
        const monthlyCost = Number(
          costInformation?.monthly_cost ??
            costInformation?.monthly_fee ??
            costInformation?.monthly ??
            0
        );

        if (!item?.phone_number || !Number.isFinite(monthlyCost) || monthlyCost < 0) {
          return null;
        }

        const features = Array.isArray(item?.features) ? item.features : [];
        const featureText = features.map((feature: any) =>
          typeof feature === "string" ? feature.toLowerCase() : ""
        );

        return {
          phone_number: String(item.phone_number),
          monthly_price: navaMonthlyPrice(monthlyCost),
          capabilities: {
            sms: featureText.includes("sms"),
            voice: featureText.includes("voice") || featureText.includes("emergency"),
          },
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      country,
      numbers,
    });
  } catch (error) {
    console.error("NAVA Phone inventory error:", error);
    return NextResponse.json(
      { error: "Unable to search NAVA Phone numbers right now." },
      { status: 500 }
    );
  }
}
