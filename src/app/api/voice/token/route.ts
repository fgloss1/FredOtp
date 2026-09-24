import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const allowLocalTest =
    process.env.NAVA_ALLOW_DIRECT_WEBRTC_TEST === "true";

  if (!allowLocalTest) {
    return NextResponse.json(
      { error: "Direct WebRTC credentials are disabled." },
      { status: 404 }
    );
  }

  const username = process.env.TELNYX_WEBRTC_USERNAME;
  const password = process.env.TELNYX_WEBRTC_PASSWORD;
  const callerNumber = process.env.TELNYX_CALLER_ID;

  if (!username || !password || !callerNumber) {
    return NextResponse.json(
      { error: "Missing Telnyx WebRTC test configuration." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      username,
      password,
      callerNumber,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
