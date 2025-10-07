import { create } from 'zustand';
import type { Credit } from '../domain/types';
import { persist } from 'zustand/middleware';
import { creditInterestMonthly, creditInterestYearly, creditTotalMonthly } from '../domain/calc';

type State = { credits: Credit[] };
type Actions = {
  addCredit: (c: Omit<Credit, 'id'>) => void;
  updateCredit: (c: Credit) => void;
  removeCredit: (id: string) => void;
};

// Helper to compute derived values for a credit object
const enrichCredit = (c: Credit): Credit => {
  const interestMonthly = creditInterestMonthly(c);
  const interestYearly = creditInterestYearly(c);
  const totalMonthly = creditTotalMonthly(c);
  return {
    ...c,
    interestMonthly,
    interestYearly,
    totalMonthly,
  };
};

export const useCreditStore = create<State & Actions>()(
  persist(
    (set) => ({
      credits: [],
      addCredit: (raw) =>
        set((s) => {
          const newCredit: Credit = {
            id: `crd_${Date.now()}`,
            ...raw,
          };
          return { credits: [...s.credits, enrichCredit(newCredit)] };
        }),
      updateCredit: (updatedCredit) =>
        set((s) => ({
          credits: s.credits.map((c) =>
            c.id === updatedCredit.id ? enrichCredit(updatedCredit) : c,
          ),
        })),
      removeCredit: (id) => set((s) => ({ credits: s.credits.filter((x) => x.id !== id) })),
    }),
    {
      name: 'credit-storage',
    },
  ),
);
