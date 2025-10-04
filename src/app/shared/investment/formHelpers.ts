import Decimal from 'decimal.js';
import type { Money } from '../../../core/domain/types.ts';

export const D = (v: Money | number | string) => new Decimal(v || '0');
export const pctToFrac = (s: string) => D(normalize(s)).div(100);
export const cfgToPctStr = (v: number) => new Decimal(v * 100).toDP(2).toString();

export const normalize = (v: string) => (v ?? '').toString().replace(/\s/g, '').replace(',', '.');

export const sanitizeDecimal = (value: string): string => {
  if (value === null || value === undefined) return '';
  // First, replace comma with a dot
  let str = String(value).replace(/,/g, '.');
  // Then, remove all characters that are not a digit or a dot
  str = str.replace(/[^\d.]/g, '');

  // Ensure only one decimal point exists
  const firstDotIndex = str.indexOf('.');
  if (firstDotIndex !== -1) {
    const integerPart = str.substring(0, firstDotIndex + 1);
    const fractionalPart = str.substring(firstDotIndex + 1).replace(/\./g, '');
    str = integerPart + fractionalPart;
  }
  return str;
};

export type CostItemState = {
  enabled: boolean;
  value: string;
  mode: 'percent' | 'currency';
  allowModeChange: boolean;
  label: string;
};
export type CostState = Record<string, CostItemState>;
