import Decimal from 'decimal.js';
import type { Money, Objectvestment, Credit } from './types';
const D = (v: Money | number | string) => new Decimal(v || '0');

export function netMonthly(i: Objectvestment): Money {
  return D(i.grossGainMonthly).minus(D(i.costMonthly)).toFixed(2);
}
export function netYearly(i: Objectvestment): Money {
  return D(netMonthly(i)).mul(12).toFixed(2);
}
export function yieldPctYearly(i: Objectvestment): string {
  const basis = D(i.purchasePrice);
  if (basis.isZero()) return '0';
  return D(netYearly(i)).div(basis).mul(100).toFixed(2);
}

/** 1) format money with no trailing .00, using de-DE separators */
export const fmtMoney = (m: Money) => {
  const n = Number(new Decimal(m || '0').toFixed(2));
  // show 0 decimals by default, but keep thousands separator
  return new Intl.NumberFormat('de-DE', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(n);
};
/** 2) trim .00 or 0 at the end for percentages as well */
export const fmtNumberTrim = (v: string | number) => {
  const s = typeof v === 'number' ? v.toString() : v;
  const num = Number(s);
  return new Intl.NumberFormat('de-DE', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(num);
};

/* --- NEW: Credit math --- */
// Zinsen auf (Kredithöhe - Eigenkapital)
export function creditInterestMonthly(c: Credit): Money {
  const debt = D(c.principal).minus(D(c.equity)); // Restschuld
  const r = D(c.rateAnnualPct).div(100).div(12); // Monatszins
  return debt.mul(r).toFixed(2);
}
export function creditInterestYearly(c: Credit): Money {
  return D(creditInterestMonthly(c)).mul(12).toFixed(2);
}

export function computeCashflowMonthly(i: Objectvestment, c: Credit): Money {
  // net investment income minus interest and amortization
  return D(i.grossGainMonthly)
    .minus(D(i.costMonthly))
    .minus(D(c.interestMonthly))
    .minus(D(c.amortMonthly))
    .toFixed(2);
}
