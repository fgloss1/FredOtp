/**
 * Shared OTP utility functions.
 * Used by API routes, catalog service, and test suite.
 */

export type NavaOrderStatus =
  | 'pending'
  | 'received'
  | 'completed'
  | 'canceled'
  | 'expired'
  | 'banned'
  | 'refunded'
  | 'payment_failed';

export function mapProviderStatus(providerStatus: string): NavaOrderStatus {
  switch ((providerStatus || '').toUpperCase()) {
    case 'PENDING':
      return 'pending';
    case 'RECEIVED':
      return 'received';
    case 'FINISHED':
      return 'completed';
    case 'CANCELED':
      return 'canceled';
    case 'TIMEOUT':
      return 'expired';
    case 'BANNED':
      return 'banned';
    default:
      return 'pending';
  }
}

export function extractSmsCode(order: {
  code?: string | null;
  sms?: Array<{ code?: string | null; text: string }>;
}): string | null {
  if (order.code) return order.code;
  if (order.sms && order.sms.length > 0) {
    const lastSms = order.sms[order.sms.length - 1];
    if (lastSms.code) return lastSms.code;
    const match = lastSms.text.match(/\b(\d{4,8})\b/);
    return match ? match[1] : null;
  }
  return null;
}

export function isRefundEligible(status: NavaOrderStatus): boolean {
  return status === 'pending' || status === 'received';
}

export function isActivationProduct(entry: {
  category?: string;
  qty?: number;
  count?: number;
  price?: number;
  cost?: number;
}): boolean {
  if (entry.category === undefined) return true;
  return entry.category.toLowerCase() === 'activation';
}

export function hasInventory(entry: {
  category?: string;
  qty?: number;
  count?: number;
  price?: number;
  cost?: number;
}): boolean {
  const availableQty = entry.qty ?? entry.count ?? 0;
  const itemPrice = entry.price ?? entry.cost ?? 0;
  return availableQty > 0 && itemPrice > 0;
}

export function validateClientPrice(
  clientPrice: number,
  serverPrice: number,
  tolerancePercent: number = 5
): boolean {
  if (!serverPrice || serverPrice <= 0) return false;
  if (!clientPrice || clientPrice <= 0) return false;
  const tolerance = serverPrice * (tolerancePercent / 100);
  return Math.abs(clientPrice - serverPrice) <= tolerance;
}