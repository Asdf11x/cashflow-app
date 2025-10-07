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
  const totalvested = D(i.startAmount);
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

/* --- UPDATED: Credit math --- */

/** Calculates the interest for the first month based on the total principal. */
export function creditInterestMonthly(c: Credit): Money {
  const principal = D(c.principal);
  const monthlyRate = D(c.rateAnnualPct).div(100).div(12); // Monthly interest rate
  return principal.mul(monthlyRate).toFixed(2);
}

/** Calculates the total interest for the first year. */
export function creditInterestYearly(c: Credit): Money {
  // This is a simplification for display; a real amortization schedule would be more precise.
  return D(creditInterestMonthly(c)).mul(12).toFixed(2);
}

/** Calculates the total monthly payment (interest + amortization). */
export function creditTotalMonthly(c: Credit): Money {
  const interest = D(creditInterestMonthly(c));
  const amortization = D(c.amortMonthly);
  return interest.add(amortization).toFixed(2);
}

export function computeCashflowMonthly(
  investment: ObjectInvestment | RealEstateInvestment,
  credit: Credit,
): Decimal {
  const investmentNetGain = new Decimal(investment.netGainMonthly ?? '0');
  const creditTotalPayment = new Decimal(credit.totalMonthly ?? '0');

  // Cashflow is the investment's net gain minus the total credit payment
  return investmentNetGain.sub(creditTotalPayment);
}
