import Decimal from 'decimal.js';
import type { Money, ObjectInvestment, Credit, RealEstateInvestment } from './types';
const D = (v: Money | number | string) => new Decimal(v || '0');

// calc.ts - adjust these functions
export function netMonthly(i: ObjectInvestment): Money {
  return i.netGainMonthly; // For objects, monthlyGain is already net
}

export function netYearly(i: ObjectInvestment): Money {
  return D(i.netGainMonthly).mul(12).toFixed(2);
}

export function yieldPctYearly(i: ObjectInvestment): string {
  const totalvested = D(i.purchasePrice);
  const yearlyGain = D(i.netGainMonthly).mul(12);
  return totalvested.gt(0) ? yearlyGain.div(totalvested).mul(100).toFixed(2) : '0.00';
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

export function computeCashflowMonthly(
  investment: ObjectInvestment | RealEstateInvestment,
  credit: Credit,
): Decimal {
  const iGain = new Decimal(investment.netGainMonthly ?? '0');
  const cInterest = new Decimal(credit.interestMonthly ?? '0');
  const cAmort = new Decimal(credit.amortMonthly ?? '0');

  return iGain.sub(cInterest).sub(cAmort);
}
