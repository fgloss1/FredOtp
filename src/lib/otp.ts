import { randomInt } from "node:crypto";

/**
 * Generates a realistic looking phone number for a country.
 * `#` is any digit, `%` is a digit from 2-9 (valid leading digit).
 * e.g. "+1 (%##) %##-####"
 */
export function generatePhoneNumber(pattern: string): string {
  return pattern
    .replace(/%/g, () => String(randomInt(2, 10)))
    .replace(/#/g, () => String(randomInt(0, 10)));
}

export function generateOtpCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i += 1) code += String(randomInt(0, 10));
  return code;
}

export function renderSms(template: string, code: string): string {
  return template.replace(/\{code\}/g, code);
}

/** Simulated carrier delivery latency for the inbound SMS. */
export function deliveryDelaySeconds(): number {
  return randomInt(7, 22);
}

export const RENTAL_WINDOW_MINUTES = 15;

export type RentalStatus = "waiting" | "received" | "cancelled" | "expired";

export function statusLabel(status: string): string {
  switch (status) {
    case "waiting":
      return "Waiting for SMS";
    case "received":
      return "Code received";
    case "cancelled":
      return "Cancelled & refunded";
    case "expired":
      return "Expired & refunded";
    default:
      return status;
  }
}

export function statusTone(status: string): string {
  switch (status) {
    case "waiting":
      return "bg-amber-400/10 text-amber-300 ring-amber-400/30";
    case "received":
      return "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30";
    case "cancelled":
      return "bg-slate-400/10 text-slate-300 ring-slate-400/30";
    case "expired":
      return "bg-rose-400/10 text-rose-300 ring-rose-400/30";
    default:
      return "bg-slate-400/10 text-slate-300 ring-slate-400/30";
  }
}
