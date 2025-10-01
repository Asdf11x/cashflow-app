import { create } from 'zustand';
import type { Credit } from '../domain/types';
import { creditInterestMonthly, creditInterestYearly } from '../domain/calc';

type State = { credits: Credit[] };
type Actions = {
  addCreditRaw: (c: Omit<Credit, 'interestMonthly' | 'interestYearly'>) => void;
  removeCredit: (id: string) => void;
};

export const useCreditStore = create<State & Actions>((set) => ({
  credits: [],
  addCreditRaw: (raw) =>
    set((s) => {
      const c: Credit = {
        ...raw,
        interestMonthly: '0',
        interestYearly: '0',
      };
      c.interestMonthly = creditInterestMonthly(c);
      c.interestYearly = creditInterestYearly(c);
      return { credits: [...s.credits, c] };
    }),
  removeCredit: (id) => set((s) => ({ credits: s.credits.filter((x) => x.id !== id) })),
}));
