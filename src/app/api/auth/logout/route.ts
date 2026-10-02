import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    // Ignore error if session already cleared
  }

  const url = new URL("/login", req.url);
  return NextResponse.redirect(url);
}