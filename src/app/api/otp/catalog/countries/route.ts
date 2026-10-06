import { NextRequest, NextResponse } from 'next/server';
import { getCountriesForService } from '@/lib/otp-catalog';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const service = searchParams.get('service');

    if (!service) {
      return NextResponse.json(
        { success: false, error: 'Service parameter is required' },
        { status: 400 }
      );
    }

    const countries = await getCountriesForService(service.toLowerCase());
    return NextResponse.json({
      success: true,
      service: service.toLowerCase(),
      count: countries.length,
      countries,
    });
  } catch (error: any) {
    console.error('[OTP Catalog] Failed to fetch countries:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load countries' },
      { status: 500 }
    );
  }
}