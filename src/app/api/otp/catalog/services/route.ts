import { NextResponse } from 'next/server';
import { getGlobalServices } from '@/lib/otp-catalog';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const services = await getGlobalServices();
    return NextResponse.json({
      success: true,
      count: services.length,
      services,
    });
  } catch (error: any) {
    console.error('[OTP Catalog] Failed to fetch global services:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load services' },
      { status: 500 }
    );
  }
}