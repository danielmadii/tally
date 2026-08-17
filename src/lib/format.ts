const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || "USD";

// IQD trades in whole dinars — no fraction digits despite the ISO default of 3.
const money = new Intl.NumberFormat("en", {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: CURRENCY === "IQD" ? 0 : 2,
  minimumFractionDigits: 0,
});

export const fmtMoney = (n: number) => money.format(n);

export const fmtInt = (n: number) => new Intl.NumberFormat("en").format(n);

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" });

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en", { day: "numeric", month: "short" });

/** Business day with the 06:00 cut-off, mirrored from create_sale() in SQL. */
export function businessDate(d = new Date()): string {
  const shifted = new Date(d.getTime() - 6 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

export function monthStart(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
