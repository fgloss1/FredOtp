export async function sendTelnyxSms({ from, to, text }: { from: string; to: string; text: string }) {
  const apiKey = process.env.TELNYX_API_KEY;

  if (!apiKey) {
    return {
      id: `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      status: "sent",
      simulated: true,
    };
  }

  const response = await fetch("https://api.telnyx.com/v2/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, text }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.errors?.[0]?.detail || "Failed to send SMS via Telnyx");

  return {
    id: data.data.id,
    status: data.data.to?.[0]?.status || "queued",
    simulated: false,
  };
}