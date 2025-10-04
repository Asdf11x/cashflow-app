// src/core/state/useInvestStore.ts
import { create } from 'zustand';
import type { ObjectInvestment, RealEstateInvestment } from '../domain/types';
import { getDefaultCostsConfig } from '../../config';
import type { RealEstateCostsConfig } from '../../config/costs';
import { buildRealEstateInvestmentOutput } from '../domain/realEstateCalculator.ts';

type State = {
  objects: ObjectInvestment[];
  realEstates: RealEstateInvestment[];
};

type Actions = {
  addObjectRaw: (i: Omit<ObjectInvestment, 'costMonthly'>) => void;
  removeObject: (id: string) => void;
  addRealEstateRaw: (
    i: Omit<
      RealEstateInvestment,
      | 'details'
      | 'additionalPurchaseCosts'
      | 'monthlyColdRent'
      | 'runningCostsRent'
      | 'additionalRunningCostsRent'
      | 'totalAdditionalPurchaseCosts'
      | 'totalRunningCostsAnnually'
      | 'purchaseCosts'
      | 'annualColdRent'
      | 'incomeTaxAmountAnnual'
      | 'solidarityAnnual'
      | 'churchTaxAnnual'
      | 'netRentAfterTaxAnnual'
      | 'apportionableMonthly'
      | 'nonApportionableMonthly'
      | 'totalRunningCostsMonthly'
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
      const newObject = iRaw as ObjectInvestment;
      return { objects: [...s.objects, newObject] };
    }),

  removeObject: (id) => set((s) => ({ objects: s.objects.filter((o) => o.id !== id) })),

  addRealEstateRaw: (iRaw, opts, cfg) =>
    set((s) => {
      const cfgToUse = cfg ?? defaultCfg;
      const computed = buildRealEstateInvestmentOutput(
        {
          ...iRaw,
          netGainMonthly: '0',
          details: '',
          additionalPurchaseCosts: '',
          monthlyColdRent: '',
          runningCostsRent: '',
          netGainYearly: '0',
          returnPercent: '0',
          purchaseCosts: {} as any,
          annualColdRent: '0',
          incomeTaxAmountAnnual: '0',
          solidarityAnnual: '0',
          churchTaxAnnual: '0',
          netRentAfterTaxAnnual: '0',
          apportionableMonthly: '0',
          nonApportionableMonthly: '0',
          totalRunningCostsMonthly: '0',
        } as unknown as RealEstateInvestment,
        cfgToUse,
        opts,
      );
      return { realEstates: [...s.realEstates, computed] };
    }),

  removeRealEstate: (id) => set((s) => ({ realEstates: s.realEstates.filter((r) => r.id !== id) })),
}));
