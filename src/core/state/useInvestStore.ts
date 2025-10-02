// src/core/state/useInvestStore.ts
import { create } from 'zustand';
import type { ObjectInvestment, RealEstateInvestment } from '../domain/types';
import { netMonthly, netYearly, yieldPctYearly } from '../domain/calc';
import { getDefaultCostsConfig } from '../../config';
import type { RealEstateCostsConfig } from '../../config/costs';
import { buildRealEstateInvestmentOutput } from '../domain/realEstateCalculator.ts';

type State = {
  objects: ObjectInvestment[];
  realEstates: RealEstateInvestment[];
};

type Actions = {
  addObjectRaw: (
    i: Omit<ObjectInvestment, 'netGainMonthly' | 'netGainYearly' | 'yieldPctYearly'>,
  ) => void;
  removeObject: (id: string) => void;

  addRealEstateRaw: (
    i: Omit<
      RealEstateInvestment,
      | 'appliedPurchaseCosts'
      | 'annualColdRent'
      | 'incomeTaxAmountAnnual'
      | 'solidarityAnnual'
      | 'churchTaxAnnual'
      | 'netRentAfterTaxAnnual'
      | 'apportionableAnnual'
      | 'nonApportionableAnnual'
      | 'totalRunningCostsAnnual'
      | 'netGainMonthly'
      | 'netGainYearly'
      | 'yieldPctYearly'
    >,
    opts?: { includeBroker?: boolean; includeAppraisal?: boolean; includeInsuranceSetup?: boolean },
    cfgOverride?: RealEstateCostsConfig,
  ) => void;
  removeRealEstate: (id: string) => void;
};

const defaultCfg: RealEstateCostsConfig = getDefaultCostsConfig();

export const useInvestStore = create<State & Actions>((set) => ({
  objects: [],
  realEstates: [],

  addObjectRaw: (iRaw) =>
    set((s) => {
      const draft: ObjectInvestment = {
        ...iRaw,
        netGainMonthly: '0',
        netGainYearly: '0',
        yieldPctYearly: '0',
      } as ObjectInvestment;
      draft.netGainMonthly = netMonthly(draft);
      draft.netGainYearly = netYearly(draft);
      draft.yieldPctYearly = yieldPctYearly(draft);
      return { objects: [...s.objects, draft] };
    }),

  removeObject: (id) => set((s) => ({ objects: s.objects.filter((o) => o.id !== id) })),

  addRealEstateRaw: (iRaw, opts, cfg) =>
    set((s) => {
      const cfgToUse = cfg ?? defaultCfg;
      const computed = buildRealEstateInvestmentOutput(
        {
          ...iRaw,
          // placeholders (builder will fill)
          netGainMonthly: '0',
          netGainYearly: '0',
          yieldPctYearly: '0',
          appliedPurchaseCosts: {} as any,
          annualColdRent: '0',
          incomeTaxAmountAnnual: '0',
          solidarityAnnual: '0',
          churchTaxAnnual: '0',
          netRentAfterTaxAnnual: '0',
          apportionableAnnual: '0',
          nonApportionableAnnual: '0',
          totalRunningCostsAnnual: '0',
        } as RealEstateInvestment,
        cfgToUse,
        opts,
      );
      return { realEstates: [...s.realEstates, computed] };
    }),

  removeRealEstate: (id) => set((s) => ({ realEstates: s.realEstates.filter((r) => r.id !== id) })),
}));
