import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Rental Services are coming soon." },
    { status: 410 }
  );
}