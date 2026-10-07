import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedSupabaseUser } from "@/lib/supabase-request-auth";
import { sendTelnyxSms } from "@/lib/telnyx";

function normalizeRecipient(value: unknown) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) return "+" + digits;
  return "+" + digits;
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedSupabaseUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });

    const { data: numbers, error: numbersError } = await supabaseAdmin
      .from("nava_phone_numbers")
      .select("id, phone_number, country_code, status")
      .eq("user_id", user.id)
      .neq("status", "released")
      .order("created_at", { ascending: false });

    if (numbersError) {
      console.error("NAVA SMS number lookup error:", numbersError);
      return NextResponse.json({ error: "Unable to load your NAVA Phone numbers." }, { status: 500 });
    }

    const numberIds = (numbers || []).map((number) => number.id);
    if (numberIds.length === 0) {
      return NextResponse.json({ success: true, numbers: [], messages: [] });
    }

    const { data: messages, error: messagesError } = await supabaseAdmin
      .from("nava_phone_messages")
      .select("id, phone_number_id, direction, from_number, to_number, body, status, created_at")
      .eq("user_id", user.id)
      .in("phone_number_id", numberIds)
      .order("created_at", { ascending: true })
      .limit(500);

    if (messagesError) {
      console.error("NAVA SMS message lookup error:", messagesError);
      return NextResponse.json({ error: "Unable to load your NAVA messages." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      numbers: numbers || [],
      messages: messages || [],
    });
  } catch (error) {
    console.error("NAVA SMS inbox error:", error);
    return NextResponse.json({ error: "Unable to load your NAVA messages." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedSupabaseUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });

    const body = await req.json();
    const phoneNumberId = String(body?.phone_number_id || "").trim();
    const recipient = normalizeRecipient(body?.to);
    const messageText = String(body?.text || "").trim();

    if (!phoneNumberId) {
      return NextResponse.json({ error: "Please select a NAVA Phone number." }, { status: 400 });
    }

    if (!/^\+[1-9]\d{7,14}$/.test(recipient)) {
      return NextResponse.json({ error: "Please enter a valid recipient number." }, { status: 400 });
    }

    if (!messageText || messageText.length > 1600) {
      return NextResponse.json({ error: "Please enter a message up to 1600 characters." }, { status: 400 });
    }

    const { data: number, error: numberError } = await supabaseAdmin
      .from("nava_phone_numbers")
      .select("id, phone_number, status")
      .eq("id", phoneNumberId)
      .eq("user_id", user.id)
      .neq("status", "released")
      .maybeSingle();

    if (numberError || !number) {
      return NextResponse.json({ error: "That NAVA Phone number is not available." }, { status: 404 });
    }

    const mode = String(process.env.NAVA_PHONE_PURCHASE_MODE || "live").trim().toLowerCase();
    let providerMessageId: string | null = null;
    let status = "queued";

    if (mode === "simulation") {
      providerMessageId = "sim_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
      status = "sent";
    } else if (mode === "live") {
      try {
        const result = await sendTelnyxSms({
          from: number.phone_number,
          to: recipient,
          text: messageText,
        });
        providerMessageId = result.id;
        status = result.status || "queued";
      } catch (sendError) {
        console.error("NAVA SMS send failed:", sendError);
        return NextResponse.json({ error: "We could not send your message. Please try again." }, { status: 502 });
      }
    } else {
      return NextResponse.json(
        { error: "NAVA SMS sending is not enabled in this environment." },
        { status: 503 }
      );
    }

    const { data: savedMessage, error: insertError } = await supabaseAdmin
      .from("nava_phone_messages")
      .insert({
        phone_number_id: number.id,
        user_id: user.id,
        direction: "outbound",
        from_number: number.phone_number,
        to_number: recipient,
        body: messageText,
        status,
        provider_message_id: providerMessageId,
      })
      .select("id, phone_number_id, direction, from_number, to_number, body, status, created_at")
      .single();

    if (insertError || !savedMessage) {
      console.error("NAVA SMS message save failed:", insertError);
      return NextResponse.json({ error: "Your message could not be saved." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: savedMessage,
    });
  } catch (error) {
    console.error("NAVA SMS send route error:", error);
    return NextResponse.json({ error: "Unable to send your NAVA message." }, { status: 500 });
  }
}
