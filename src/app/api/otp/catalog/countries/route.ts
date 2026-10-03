import { NextRequest, NextResponse } from 'next/server';
import { getCountriesForService } from '@/lib/otp-catalog';
export const dynamic = 'force-dynamic';
export async function GET(request:NextRequest) {
  const service = new URL(request.url).searchParams.get('service')?.trim().toLowerCase();
  if (!service) return NextResponse.json({success:false,error:'Service parameter is required'},{status:400});
  try { const countries = await getCountriesForService(service); return NextResponse.json({success:true,service,count:countries.length,countries}); }
  catch (error:any) { console.error('[OTP Catalog] countries',error); return NextResponse.json({success:false,error:error.message||'Failed to load countries'},{status:502}); }
}
