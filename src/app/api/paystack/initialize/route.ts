import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Paystack wallet top-up is temporarily unavailable. Please use the available NAVA wallet deposit method."
    },
    { status: 410 }
  );
}