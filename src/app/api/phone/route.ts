import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedSupabaseUser } from "@/lib/supabase-request-auth";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedSupabaseUser(req);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("nava_phone_numbers")
      .select(
        "id, phone_number, status, country_code, capabilities, monthly_price, created_at"
      )
      .eq("user_id", user.id)
      .neq("status", "released")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("NAVA Phone number lookup error:", error);
      return NextResponse.json(
        { error: "Unable to load your NAVA Phone numbers." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      numbers: data ?? [],
    });
  } catch (error: any) {
    console.error("NAVA Phone API error:", error);
    return NextResponse.json(
      { error: error?.message || "Unable to load Phone service." },
      { status: 500 }
    );
  }
}
