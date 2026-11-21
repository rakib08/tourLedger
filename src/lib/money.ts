/** Currency-aware integer minor-unit helpers. BDT: 100 poisha = ৳1; KRW: 1 won = 1 unit. */
export function currencyFractionDigits(currency = 'BDT'): number {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
}

export function formatMoney(minor: number, currency = 'BDT', locale = 'en-BD') {
  const digits = currencyFractionDigits(currency);
  return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits })
    .format(minor / (10 ** digits));
}

export function formatMoneyInput(minor: number, currency = 'BDT') {
  const digits = currencyFractionDigits(currency);
  return (minor / (10 ** digits)).toFixed(digits);
}

export function parseMoneyInput(value: string, currency = 'BDT') {
  const digits = currencyFractionDigits(currency);
  const raw = value.trim();
  const parts = raw.split('.');
  if (parts.length > 2 || !/^\d{1,12}$/.test(parts[0] ?? '')) return null;
  const fraction = parts[1] ?? '';
  if (digits === 0 ? parts.length !== 1 : fraction.length > digits || (parts.length === 2 && !/^\d+$/.test(fraction))) return null;
  const whole = parts[0];
  const amount = Number(whole) * (10 ** digits) + Number(fraction.padEnd(digits, '0'));
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

/** Fair deterministic split; leftover minor units go to sorted member IDs. */
export function splitMinorUnits(totalMinor: number, memberIds: string[]) {
  if (!Number.isSafeInteger(totalMinor) || totalMinor < 0) throw new Error('Invalid amount.');
  if (memberIds.length === 0) return [];
  const sorted = [...memberIds].sort();
  const base = Math.floor(totalMinor / sorted.length);
  const remainder = totalMinor % sorted.length;
  return sorted.map((memberId, index) => ({ memberId, amountMinor: base + (index < remainder ? 1 : 0) }));
}
