import Decimal from 'decimal.js';
import type { Money, Objectvestment } from './types.ts';

const D = (v: Money | number | string) => new Decimal(v || '0');
const to2 = (d: Decimal) => d.toFixed(2);

export function netMonthly(i: Objectvestment): Money {
  return to2(D(i.grossGainMonthly).minus(D(i.costMonthly)));
}

export function netYearly(i: Objectvestment): Money {
  return to2(D(netMonthly(i)).mul(12));
}

export function yieldPctYearly(i: Objectvestment): string {
  const yearly = D(netYearly(i));
  const basis = D(i.purchasePrice);
  if (basis.isZero()) return '0.00';
  return yearly.div(basis).mul(100).toFixed(2);
}

// Formatter (schlicht)
export const fmtMoney = (m: Money) => new Decimal(m || '0').toFixed(2).replace('.', ',');
