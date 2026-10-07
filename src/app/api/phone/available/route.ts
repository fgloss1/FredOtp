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

    const searchParams = new URL(req.url).searchParams;
    const country = searchParams.get("country")?.trim().toUpperCase();
    const searchType = searchParams.get("searchType")?.trim().toLowerCase() || "any";
    const pattern = searchParams.get("pattern")?.trim() || "";
    const areaCode = searchParams.get("areaCode")?.trim() || "";
    const city = searchParams.get("city")?.trim() || "";
    const state = searchParams.get("state")?.trim().toUpperCase() || "";
    const rateCenter = searchParams.get("rateCenter")?.trim() || "";
    const numberType = searchParams.get("numberType")?.trim().toLowerCase() || "";
    const capability = searchParams.get("capability")?.trim().toLowerCase() || "sms";
    const quickship = searchParams.get("quickship") === "true";
    const reservable = searchParams.get("reservable") === "true";

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
    params.set("filter[limit]", "12");
    params.set("filter[exclude_held_numbers]", "true");

    const allowedTypes = new Set(["local", "toll_free", "mobile", "national", "shared_cost"]);
    const allowedCapabilities = new Set(["sms", "voice", "mms", "fax", "emergency", "hd_voice", "international_sms", "local_calling"]);

    if (allowedCapabilities.has(capability)) {
      params.append("filter[features]", capability);
    } else {
      params.append("filter[features]", "sms");
    }

    if (allowedTypes.has(numberType)) params.set("filter[phone_number_type]", numberType);
    if (areaCode && /^\d{2,6}$/.test(areaCode)) params.set("filter[national_destination_code]", areaCode);
    if (city) params.set("filter[locality]", city.slice(0, 100));
    if (state && /^[A-Z]{2,3}$/.test(state)) params.set("filter[administrative_area]", state);
    if (rateCenter) params.set("filter[rate_center]", rateCenter.slice(0, 100));
    if (quickship) params.set("filter[quickship]", "true");
    if (reservable) params.set("filter[reservable]", "true");

    if (pattern) {
      if (!/^\d{1,15}$/.test(pattern)) {
        return NextResponse.json({ error: "Use numbers only for the number pattern." }, { status: 400 });
      }

      if (searchType === "starts") params.set("filter[phone_number][starts_with]", pattern);
      else if (searchType === "ends") params.set("filter[phone_number][ends_with]", pattern);
      else if (searchType === "contains") params.set("filter[phone_number][contains]", pattern);
      else {
        return NextResponse.json({ error: "Choose Starts with, Ends with, or Contains for a number pattern." }, { status: 400 });
      }
    }

    if (country !== "US" && country !== "CA" && state) {
      return NextResponse.json({ error: "State or province filtering is available for US and Canada." }, { status: 400 });
    }

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
        const featureText = features
          .map((feature: any) =>
            typeof feature === "string"
              ? feature.toLowerCase()
              : typeof feature?.name === "string"
                ? feature.name.toLowerCase()
                : ""
          )
          .filter(Boolean);

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
      filters: {
        searchType,
        pattern,
        areaCode,
        city,
        state,
        rateCenter,
        numberType,
        capability,
        quickship,
        reservable,
      },
    });
  } catch (error) {
    console.error("NAVA Phone inventory error:", error);
    return NextResponse.json(
      { error: "Unable to search NAVA Phone numbers right now." },
      { status: 500 }
    );
  }
}
