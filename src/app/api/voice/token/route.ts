import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Direct WebRTC credentials are disabled in production." },
      { status: 404 }
    );
  }

  const username = process.env.TELNYX_WEBRTC_USERNAME;
  const password = process.env.TELNYX_WEBRTC_PASSWORD;

  if (!username || !password) {
    return NextResponse.json(
      { error: "Missing Telnyx WebRTC credentials." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { username, password },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}