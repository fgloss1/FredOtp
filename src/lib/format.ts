export const USD_TO_NGN = Number(process.env.NEXT_PUBLIC_USD_TO_NGN ?? 0);

export function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function ngn(cents: number): string {
  if (!Number.isFinite(USD_TO_NGN) || USD_TO_NGN <= 0) return "₦—";
  const naira = Math.round((cents / 100) * USD_TO_NGN);
  return `₦${naira.toLocaleString("en-NG")}`;
}

export function shortDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function countdown(target: Date | string): string {
  const end = typeof target === "string" ? new Date(target).getTime() : target.getTime();
  const diff = Math.max(0, end - Date.now());
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
