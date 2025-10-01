import { create } from 'zustand';
import type { Objectvestment } from '../domain/types.ts';
import { netMonthly, netYearly, yieldPctYearly } from '../domain/calc.ts';

type State = { objects: Objectvestment[] };
type Actions = {
  addObjectRaw: (
    i: Omit<Objectvestment, 'netGainMonthly' | 'netGainYearly' | 'yieldPctYearly'>,
  ) => void;
  removeObject: (id: string) => void;
};

export const useInvestStore = create<State & Actions>((set) => ({
  objects: [],
  addObjectRaw: (iRaw) =>
    set((s) => {
      const draft: Objectvestment = {
        ...iRaw,
        netGainMonthly: '0',
        netGainYearly: '0',
        yieldPctYearly: '0',
      } as Objectvestment;
      draft.netGainMonthly = netMonthly(draft);
      draft.netGainYearly = netYearly(draft);
      draft.yieldPctYearly = yieldPctYearly(draft);
      return { objects: [...s.objects, draft] };
    }),
  removeObject: (id) => set((s) => ({ objects: s.objects.filter((o) => o.id !== id) })),
}));
