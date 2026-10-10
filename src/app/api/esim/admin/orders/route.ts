import { NextResponse } from "next/server";
import { getAuthenticatedSupabaseUser } from "@/lib/supabase-request-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  try {
    const authUser = await getAuthenticatedSupabaseUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", authUser.id)
      .maybeSingle();

    if (profileError) {
      console.error("eSIM admin profile lookup failed:", profileError);
      return NextResponse.json(
        { error: "Unable to verify admin access" },
        { status: 500 }
      );
    }

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("nava_esim_orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load eSIM orders:", error.message);
      return NextResponse.json(
        { error: "Failed to load eSIM orders" },
        { status: 500 }
      );
    }

    return NextResponse.json({ orders: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "Unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    if (message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    console.error("Admin eSIM orders error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}