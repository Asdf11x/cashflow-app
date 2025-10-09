// src/core/hooks/useCurrencyConverter.tsx

import { useSettingsStore } from '../state/useSettingsStore';
import { useCallback } from 'react';
import Decimal from 'decimal.js';

const BASE_CURRENCY = 'EUR';
const D = (v: number | string) => new Decimal(v || '0');

/**
 * A hook to provide currency conversion functionality based on global settings.
 * It uses Decimal.js for precision and assumes all exchange rates in the store
 * are relative to a single BASE_CURRENCY (EUR).
 */
export const useCurrencyConverter = () => {
  const { mainCurrency, exchangeRates } = useSettingsStore();

  const convert = useCallback(
    (amount: number | string, fromCurrency: string): number => {
      const numericAmount = D(amount);
      if (
        numericAmount.isZero() ||
        mainCurrency === 'NONE' ||
        !mainCurrency ||
        fromCurrency === mainCurrency
      ) {
        return numericAmount.toNumber(); // Return as a standard number for rendering
      }

      // Step 1: Convert the 'fromCurrency' amount to the BASE_CURRENCY (EUR)
      let amountInBase: Decimal;
      if (fromCurrency === BASE_CURRENCY) {
        amountInBase = numericAmount;
      } else {
        const rate = exchangeRates[fromCurrency];
        if (!rate) {
          console.warn(`Exchange rate for ${fromCurrency} not found.`);
          return numericAmount.toNumber(); // Return original if rate is missing
        }
        amountInBase = numericAmount.div(D(rate));
      }

      // Step 2: Convert from BASE_CURRENCY to the target 'mainCurrency'
      let finalAmount: Decimal;
      if (mainCurrency === BASE_CURRENCY) {
        finalAmount = amountInBase;
      } else {
        const targetRate = exchangeRates[mainCurrency];
        if (!targetRate) {
          console.warn(`Exchange rate for ${mainCurrency} not found.`);
          return numericAmount.toNumber(); // Return original if rate is missing
        }
        finalAmount = amountInBase.mul(D(targetRate));
      }

      // Return as a standard number, rounded to 2 decimal places for currency.
      return finalAmount.toDecimalPlaces(2).toNumber();
    },
    [mainCurrency, exchangeRates],
  );

  return { convert, mainCurrency, isConversionActive: mainCurrency !== 'NONE' && !!mainCurrency };
};
