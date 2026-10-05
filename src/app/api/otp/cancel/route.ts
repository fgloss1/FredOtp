import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const orderId = body.orderId || body.id;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Missing order ID for cancellation.' },
        { status: 400 }
      );
    }

    // 1. Resolve Authenticated User
    let userId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) userId = user.id;
    } catch (_) {}

    // 2. Locate Order in Supabase Database
       let dbOrder: any = null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(orderId));

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq(isUuid ? 'id' : 'supplier_order_id', String(orderId))
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      dbOrder = data;
      if (!userId) userId = data.user_id;
    }

    if (!dbOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found. No refund issued.' },
        { status: 404 }
      );
    }

    const supplierOrderId = dbOrder.supplier_order_id || String(orderId);
    const refundAmount = Number(dbOrder.price_usd || 0);

    // Prevent double refunds if order is already canceled or completed
    if (['canceled', 'refunded', 'completed', 'expired'].includes(dbOrder.status?.toLowerCase())) {
        return NextResponse.json({
        success: true,
        message: 'Order is already closed or refunded.',
        status: dbOrder.status,
      });
    }

    // 3. Cancel Order with 5SIM Provider (if token exists)
    const fivesimToken = process.env.FIVESIM_API_TOKEN || process.env.FIVESIM_API_KEY;
    if (fivesimToken && fivesimToken !== 'your_5sim_key_here' && !supplierOrderId.startsWith('MOCK-')) {
      try {
        const apiRes = await fetch(`https://5sim.net/v1/user/cancel/${supplierOrderId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${fivesimToken}`,
            Accept: 'application/json',
          },
        });

        if (!apiRes.ok) {
          const errText = await apiRes.text();
          console.warn(`5SIM order cancellation notice for ${supplierOrderId}:`, errText);
        }
      } catch (err) {
        console.warn('Network error while canceling order with 5SIM:', err);
      }
    }

    // 4. Update Database Order Status to 'canceled'
    if (dbOrder?.id) {
      await supabase
        .from('orders')
        .update({ status: 'canceled' })
        .eq('id', dbOrder.id);
    }

    // 5. Refund User Wallet Balance in Supabase 'profiles'
    let newBalance = 0.0;
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', userId)
        .single();

      const currentBalance = Number(profile?.balance || 0);
      newBalance = Number((currentBalance + refundAmount).toFixed(2));

      await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', userId);
    }

    // 6. Return Clean Structured JSON Response
    return NextResponse.json({
      success: true,
      message: 'Order canceled and refunded successfully.',
      status: 'canceled',
      refundedAmountUSD: refundAmount,
      newBalance,
    });
  } catch (err: any) {
    console.error('Error during cancellation:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Unable to process cancellation.' },
      { status: 500 }
    );
  }
}