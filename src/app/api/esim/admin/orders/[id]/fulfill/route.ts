import { NextResponse } from "next/server";
import { getAuthenticatedSupabaseUser } from "@/lib/supabase-request-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: Request, { params }: RouteContext) {
  let claimedOrderId: string | null = null;

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

    adminUserId = authUser.id;

    const { id } = await params;

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const assignedPhoneNumber =
      typeof body.assigned_phone_number === "string"
        ? body.assigned_phone_number.trim()
        : "";

    const activationCode =
      typeof body.activation_code === "string"
        ? body.activation_code.trim()
        : "";

    const customerInstructions =
      typeof body.customer_instructions === "string"
        ? body.customer_instructions.trim()
        : "";

    const supplierConfirmation =
      typeof body.supplier_confirmation === "string"
        ? body.supplier_confirmation.trim()
        : "";

    if (!assignedPhoneNumber || assignedPhoneNumber.length > 100) {
      return NextResponse.json(
        { error: "A valid assigned phone number is required" },
        { status: 400 },
      );
    }

    if (
      activationCode.length > 10000 ||
      customerInstructions.length > 5000 ||
      supplierConfirmation.length > 1000
    ) {
      return NextResponse.json(
        { error: "One or more fulfillment fields are too long" },
        { status: 400 },
      );
    }

    const { data: existingOrder, error: lookupError } = await supabaseAdmin
      .from("nava_esim_orders")
      .select("id, status")
      .eq("id", id)
      .maybeSingle();

    if (lookupError) {
      console.error("eSIM order lookup failed:", lookupError);
      return NextResponse.json(
        { error: "Unable to verify order" },
        { status: 500 },
      );
    }

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (existingOrder.status !== "paid_awaiting_fulfillment") {
      return NextResponse.json(
        {
          error: "Only paid orders awaiting fulfillment can be fulfilled",
          status: existingOrder.status,
        },
        { status: 409 },
      );
    }

    // Claim the order atomically so concurrent requests cannot both fulfill it.
    const { data: claimedOrder, error: claimError } = await supabaseAdmin
      .from("nava_esim_orders")
      .update({ status: "processing" })
      .eq("id", id)
      .eq("status", "paid_awaiting_fulfillment")
      .select("id")
      .maybeSingle();

    if (claimError) {
      console.error("eSIM order claim failed:", claimError);
      return NextResponse.json(
        { error: "Unable to claim order for fulfillment" },
        { status: 500 },
      );
    }

    if (!claimedOrder) {
      return NextResponse.json(
        { error: "Order is already being processed or is no longer eligible" },
        { status: 409 },
      );
    }

    claimedOrderId = id;

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { error: secretError } = await supabaseAdmin
      .from("nava_esim_order_secrets")
      .upsert(
        {
          order_id: id,
          activation_code_encrypted: activationCode || null,
          customer_instructions:
            customerInstructions ||
            "Scan your eSIM QR code or enter the activation details in your phone settings.",
        },
        { onConflict: "order_id" },
      );

    if (secretError) {
      console.error("eSIM activation details could not be saved:", secretError);

      const { error: rollbackError } = await supabaseAdmin
        .from("nava_esim_orders")
        .update({ status: "paid_awaiting_fulfillment" })
        .eq("id", id)
        .eq("status", "processing");

      if (rollbackError) {
        console.error("eSIM order rollback failed:", rollbackError);
      } else {
        claimedOrderId = null;
      }

      return NextResponse.json(
        { error: "Activation details could not be saved; order was not activated" },
        { status: 500 },
      );
    }

    const { data: order, error: activationError } = await supabaseAdmin
      .from("nava_esim_orders")
      .update({
        assigned_phone_number: assignedPhoneNumber,
        status: "active",
        activation_starts_at: now.toISOString(),
        activation_expires_at: expiresAt.toISOString(),
        fulfilled_by: adminUserId,
        fulfilled_at: now.toISOString(),
        supplier_confirmation:
          supplierConfirmation || "Manual admin fulfillment confirmed",
      })
      .eq("id", id)
      .eq("status", "processing")
      .select("*")
      .maybeSingle();

    if (activationError || !order) {
      console.error("eSIM order activation failed:", activationError);

      const { error: rollbackError } = await supabaseAdmin
        .from("nava_esim_orders")
        .update({ status: "paid_awaiting_fulfillment" })
        .eq("id", id)
        .eq("status", "processing");

      if (rollbackError) {
        console.error("eSIM order rollback failed:", rollbackError);
      } else {
        claimedOrderId = null;
      }

      return NextResponse.json(
        { error: "Could not activate order; it has not been confirmed active" },
        { status: 500 },
      );
    }

    claimedOrderId = null;

    return NextResponse.json({
      message: "Order fulfilled and line activated",
      order,
    });
  } catch (error) {
    console.error("eSIM fulfillment failed:", error);

    if (claimedOrderId) {
      const { error: rollbackError } = await supabaseAdmin
        .from("nava_esim_orders")
        .update({ status: "paid_awaiting_fulfillment" })
        .eq("id", claimedOrderId)
        .eq("status", "processing");

      if (rollbackError) {
        console.error("eSIM order rollback failed:", rollbackError);
      }
    }

    return NextResponse.json(
      { error: "Fulfillment failed" },
      { status: 500 },
    );
  }
}
