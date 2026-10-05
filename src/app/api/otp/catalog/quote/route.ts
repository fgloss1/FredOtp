import { NextRequest, NextResponse } from 'next/server';
import { getOtpQuote } from '@/lib/otp-catalog';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    const service = searchParams.get('service');

    if (!country || !service) {
      return NextResponse.json(
        { success: false, error: 'Country and service parameters are required' },
        { status: 400 }
      );
    }

    const quote = await getOtpQuote(country.toLowerCase(), service.toLowerCase());

    if (!quote || !quote.isViable) {
      return NextResponse.json(
        { success: false, available: false, error: 'Service temporarily out of stock' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      available: true,
      country: quote.country,
      service: quote.service,
      operator: quote.operator,
      navaPrice: quote.navaPrice,
      availability: quote.availability,
      estimatedDelivery: quote.estimatedDelivery,
    });
  } catch (error: any) {
    console.error('[OTP Catalog] Failed to fetch quote:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to calculate quote' },
      { status: 500 }
    );
  }
}