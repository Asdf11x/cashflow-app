import { create } from 'zustand';
import type { Cashflow } from '../domain/types';
import { useInvestStore } from './useInvestStore';
import { useCreditStore } from './useCreditStore';
import { computeCashflowMonthly } from '../domain/calc';

type State = { cashflows: Cashflow[] };
type Actions = {
  addCashflow: (name: string, investmentId: string, creditId: string) => void;
  removeCashflow: (id: string) => void;
};

export const useCashflowStore = create<State & Actions>((set) => ({
  cashflows: [],
  addCashflow: (name, investmentId, creditId) =>
    set((s) => {
      const i = useInvestStore.getState().objects.find((x) => x.id === investmentId);
      const c = useCreditStore.getState().credits.find((x) => x.id === creditId);
      if (!i || !c) return s;
      const cf: Cashflow = {
        id: crypto.randomUUID(),
        name,
        investmentId,
        creditId,
        cashflowMonthly: computeCashflowMonthly(i, c),
      };
      return { cashflows: [...s.cashflows, cf] };
    }),
  removeCashflow: (id) => set((s) => ({ cashflows: s.cashflows.filter((x) => x.id !== id) })),
}));
