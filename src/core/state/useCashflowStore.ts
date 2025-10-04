// src/core/state/useCashflowStore.ts
import { create } from 'zustand';
import { useInvestStore } from './useInvestStore';
import { useCreditStore } from './useCreditStore';
import { computeCashflowMonthly } from '../domain/calc';
import type { ObjectInvestment, RealEstateInvestment } from '../domain/types';

export type Cashflow = {
  id: string;
  name: string;
  investmentId: string;
  creditId: string;
  cashflowMonthly: string;
};

type State = {
  cashflows: Cashflow[];
};

type Actions = {
  addCashflow: (name: string, investmentId: string, creditId: string) => void;
  removeCashflow: (id: string) => void;
};

export const useCashflowStore = create<State & Actions>((set) => ({
  cashflows: [],

  addCashflow: (name, investmentId, creditId) => {
    // Get the current state from the other stores
    const { objects, realEstates } = useInvestStore.getState();
    const { credits } = useCreditStore.getState();

    // Combine all investments into one list to search
    const allInvestments = [...objects, ...realEstates];

    const investment = allInvestments.find((i) => i.id === investmentId);
    const credit = credits.find((c) => c.id === creditId);

    // Only proceed if both the investment and credit are found
    if (!investment || !credit) {
      console.error('Could not create cashflow: Investment or Credit not found.');
      return;
    }

    // Perform the calculation
    const cashflowMonthlyDecimal = computeCashflowMonthly(
      investment as ObjectInvestment | RealEstateInvestment,
      credit,
    );

    const newCashflow: Cashflow = {
      id: `cf_${Date.now()}`,
      name,
      investmentId,
      creditId,
      cashflowMonthly: cashflowMonthlyDecimal.toFixed(2),
    };

    set((state) => ({
      cashflows: [...state.cashflows, newCashflow],
    }));
  },

  removeCashflow: (id) =>
    set((state) => ({
      cashflows: state.cashflows.filter((cf) => cf.id !== id),
    })),
}));
