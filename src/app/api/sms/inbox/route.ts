import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Phone and SMS services are coming soon." },
    { status: 410 }
  );
}