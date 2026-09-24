import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const apiKey = process.env.TELNYX_API_KEY;
    const connectionId = process.env.TELNYX_CONNECTION_ID;

    if (!apiKey || !connectionId) {
      return NextResponse.json(
        {
          error: "Missing Telnyx configuration",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      status: "ready",
      connectionId,
      message: "Telnyx WebRTC route is connected",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Voice token route failed",
      },
      {
        status: 500,
      }
    );
  }
}
