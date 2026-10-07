import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Paystack wallet verification is temporarily unavailable."
    },
    { status: 410 }
  );
}