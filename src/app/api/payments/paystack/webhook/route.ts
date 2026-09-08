import { verifyWebhookSignature, verifyPaystackTransaction } from "@/lib/paystack";
import { fulfillPaystackPayment } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  try {
    if (!verifyWebhookSignature(rawBody, signature)) {
      return new Response("Invalid signature", { status: 401 });
    }
  } catch {
    return new Response("Webhook not configured", { status: 500 });
  }

  let event: { event?: string; data?: { reference?: string; status?: string } };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (event.event !== "charge.success") return Response.json({ ok: true });

  const reference = event.data?.reference;
  if (!reference) return new Response("Missing reference", { status: 400 });

  try {
    // The signature proves the webhook came from Paystack; verify the transaction
    // again against Paystack's API before crediting wallet value.
    const verified = await verifyPaystackTransaction(reference);
    if (!verified.status || verified.data?.status !== "success") {
      return new Response("Payment not successful", { status: 400 });
    }

    const result = await fulfillPaystackPayment(reference);
    if (!result.ok) return new Response(result.error, { status: 400 });
    return Response.json({ ok: true, alreadyFulfilled: result.alreadyFulfilled });
  } catch (error) {
    console.error("Paystack webhook error", error);
    return new Response("Webhook processing failed", { status: 500 });
  }
}
