import { create } from 'zustand';
import type {Objectvestment} from '../domain/types';
import { netMonthly, netYearly, yieldPctYearly } from '../domain/calc';

type State = { objects: Objectvestment[] };
type Actions = {
    addObjectRaw: (i: Omit<Objectvestment,
        'netGainMonthly'|'netGainYearly'|'yieldPctYearly'>) => void;
};

export const useInvestStore = create<State & Actions>((set) => ({
    objects: [],
    addObjectRaw: (iRaw) => set((s) => {
        // berechnete Felder auto befüllen
        const draft: Objectvestment = {
            ...iRaw,
            netGainMonthly: '0',
            netGainYearly: '0',
            yieldPctYearly: '0',
        } as Objectvestment;

        draft.netGainMonthly = netMonthly(draft);
        draft.netGainYearly  = netYearly(draft);
        draft.yieldPctYearly = yieldPctYearly(draft);

        return { objects: [...s.objects, draft] };
    })
}));
