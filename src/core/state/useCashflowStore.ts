import { create } from 'zustand';
import { useInvestStore } from './useInvestStore';
import { useCreditStore } from './useCreditStore';
import { computeCashflowMonthly } from '../domain/calc';
import { persist } from 'zustand/middleware';
import type { ObjectInvestment, RealEstateInvestment, Credit } from '../domain/types';

export type Cashflow = {
  id: string;
  name: string;
  investmentId: string;
  creditId: string | null;
  cashflowMonthly: string;
};

type State = {
  cashflows: Cashflow[];
};

type Actions = {
  addCashflow: (name: string, investmentId: string, creditId: string | null) => void;
  updateCashflow: (id: string, name: string, investmentId: string, creditId: string | null) => void;
  removeCashflow: (id: string) => void;
};

// The signature of this function remains the same
const calculateCashflow = (
  investment: ObjectInvestment | RealEstateInvestment,
  credit: Credit | null,
) => {
  return computeCashflowMonthly(investment, credit).toFixed(2);
};

export const useCashflowStore = create<State & Actions>()(
  persist(
    (set) => ({
      cashflows: [],

      addCashflow: (name, investmentId, creditId) => {
        const { objects, realEstates } = useInvestStore.getState();
        const { credits } = useCreditStore.getState();
        const allInvestments = [...objects, ...realEstates];

        const investment = allInvestments.find((i) => i.id === investmentId);
        // FIX: Use the nullish coalescing operator (??) to ensure that if `find`
        // returns `undefined`, it's converted to `null`. This satisfies TypeScript.
        const credit = credits.find((c) => c.id === creditId) ?? null;

        if (!investment) {
          console.error('Could not create cashflow: Investment not found.');
          return;
        }

        const newCashflow: Cashflow = {
          id: `cf_${Date.now()}`,
          name,
          investmentId,
          creditId,
          cashflowMonthly: calculateCashflow(investment, credit),
        };

        set((state) => ({ cashflows: [...state.cashflows, newCashflow] }));
      },

      updateCashflow: (id, name, investmentId, creditId) => {
        const { objects, realEstates } = useInvestStore.getState();
        const { credits } = useCreditStore.getState();
        const allInvestments = [...objects, ...realEstates];

        const investment = allInvestments.find((i) => i.id === investmentId);
        // FIX: Apply the same logic here for type safety.
        const credit = credits.find((c) => c.id === creditId) ?? null;

        if (!investment) {
          console.error('Could not update cashflow: Investment not found.');
          return;
        }

        set((state) => ({
          cashflows: state.cashflows.map((cf) =>
            cf.id === id
              ? {
                  ...cf,
                  name,
                  investmentId,
                  creditId,
                  cashflowMonthly: calculateCashflow(investment, credit),
                }
              : cf,
          ),
        }));
      },

      removeCashflow: (id) =>
        set((state) => ({
          cashflows: state.cashflows.filter((cf) => cf.id !== id),
        })),
    }),
    {
      name: 'cashflow-storage',
    },
  ),
);
