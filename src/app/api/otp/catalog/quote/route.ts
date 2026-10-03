import { NextRequest, NextResponse } from 'next/server';
import { getOtpQuote } from '@/lib/otp-catalog';
export const dynamic = 'force-dynamic';
export async function GET(request:NextRequest) {
  const params = new URL(request.url).searchParams;
  const country = params.get('country')?.trim().toLowerCase();
  const service = params.get('service')?.trim().toLowerCase();
  if (!country || !service) return NextResponse.json({success:false,error:'country and service are required'},{status:400});
  try { const quote = await getOtpQuote(country,service); if(!quote) return NextResponse.json({success:false,error:'Service temporarily out of stock'},{status:404}); return NextResponse.json({success:true,quote}); }
  catch (error:any) { console.error('[OTP Catalog] quote',error); return NextResponse.json({success:false,error:error.message||'Failed to load quote'},{status:502}); }
}
