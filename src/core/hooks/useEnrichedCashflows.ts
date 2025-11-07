// src/core/hooks/useEnrichedCashflows.ts

import * as React from 'react';
import { useCashflowStore, type Cashflow } from '../state/useCashflowStore';
import { useInvestStore } from '../state/useInvestStore';
import { useCreditStore } from '../state/useCreditStore';
import { useCurrencyConverter } from './useCurrencyConverter';

// This interface defines the final, consistent data structure that both the
// list and visualization will use.
export interface EnrichedCashflow extends Cashflow {
  investmentName: string;
  creditName: string;
  // Final, rounded, integer values to be used for all displays and calculations.
  displayCashflowMonthly: number;
  displayCashflowYearly: number;
  yieldPct: number;
  currency: string;
}

/**
 * A centralized hook to process raw cashflows into a consistent, enriched format
 * for display across the application (List, Visualization, etc.).
 *
 * This hook is now the SINGLE SOURCE OF TRUTH for calculated cashflow values.
 * It ensures all calculations (like rounding and annual conversion) are done once
 * and are used consistently everywhere.
 */
export function useEnrichedCashflows(): EnrichedCashflow[] {
  const { cashflows } = useCashflowStore();
  const { objects, realEstates, deposits } = useInvestStore();
  const credits = useCreditStore((s) => s.credits);
  const { convert, mainCurrency, isConversionActive } = useCurrencyConverter();

  const allInvestments = React.useMemo(
    () => [...objects, ...realEstates, ...deposits],
    [objects, realEstates, deposits],
  );

  return React.useMemo(
    () =>
      cashflows.map((cf) => {
        const investment = allInvestments.find((i) => i.id === cf.investmentId);
        const credit = cf.creditId ? credits.find((c) => c.id === cf.creditId) : null;

        const originalPurchasePrice = parseFloat(
          investment?.totalPrice || investment?.startAmount || '0',
        );
        const originalCashflowMonthly = parseFloat(cf.cashflowMonthly);
        const originalCurrency = investment?.currency || mainCurrency;

        // Step 1: Handle currency conversion if active.
        const convertedMonthly = isConversionActive
          ? convert(originalCashflowMonthly, originalCurrency)
          : originalCashflowMonthly;

        // Step 2: Round the monthly value to the nearest integer. This is the key step
        // to ensure no decimals are used in subsequent calculations.
        const roundedMonthly = Math.round(convertedMonthly);

        // Step 3: Calculate the annual value based *only* on the final rounded monthly value.
        // This guarantees that Annual = Monthly * 12, exactly.
        const roundedYearly = roundedMonthly * 12;

        const yieldPct =
          originalPurchasePrice > 0
            ? ((originalCashflowMonthly * 12) / originalPurchasePrice) * 100
            : 0;

        return {
          ...cf,
          investmentName: investment?.name || '—',
          creditName: credit?.name || '—',
          // Store the final, consistent numbers for everyone to use.
          displayCashflowMonthly: roundedMonthly,
          displayCashflowYearly: roundedYearly,
          // The original string value is preserved to satisfy the base type, but it
          // should NOT be used for display or further calculations.
          cashflowMonthly: cf.cashflowMonthly,
          yieldPct: yieldPct,
          currency: originalCurrency,
        };
      }),
    [cashflows, allInvestments, credits, isConversionActive, convert, mainCurrency],
  );
}
