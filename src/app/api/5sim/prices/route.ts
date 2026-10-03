import { NextResponse } from "next/server";
import { getLive5SimPrice } from "@/lib/5sim";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const country = searchParams.get("country") || "usa";
    const service = searchParams.get("service") || "whatsapp";

    const priceData = await getLive5SimPrice(country, service);

    if (!priceData) {
      return NextResponse.json(
        { error: "Unable to retrieve live provider pricing for this service/country." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      pricing: priceData,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch pricing" },
      { status: 500 }
    );
  }
}