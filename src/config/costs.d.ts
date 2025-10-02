export type Rate = number; // 0.05 = 5%

export interface PurchaseCostRate {
  label_de: string;
  rateOfPurchasePrice: Rate;
  optional: boolean;
}

export interface AdditionalCostRate extends PurchaseCostRate {}

export interface PurchaseCostsConfig {
  basicCosts: {
    brokerCommission: PurchaseCostRate;
    propertyTransferTax: PurchaseCostRate;
    notaryFees: PurchaseCostRate;
    landRegistryFees: PurchaseCostRate;
  };
  additionalCosts: {
    appraisalFee: AdditionalCostRate;
    insuranceSetup: AdditionalCostRate;
  };
}

export interface RentTaxesConfig {
  labels: { grossRent: string; netAfterTax: string };
  taxes: {
    incomeTax: { label_de: string; base: 'gross_rent'; rate: Rate; optional: boolean };
    solidaritySurcharge: {
      label_de: string;
      appliesTo: 'incomeTax';
      rate: Rate;
      optional: boolean;
    };
    churchTax: { label_de: string; appliesTo: 'incomeTax'; rate: Rate; optional: boolean };
  };
}

export interface RunningCostBlock {
  key: string;
  label_de: string;
  mode: 'percentage' | 'manual';
  percentageOfAnnualColdRent: Rate;
  manualAnnualAmount: number; // Money as number here; convert to decimal.js in calc
  allowManualOverride: boolean;
}

export interface RunningCostsConfig {
  apportionableOperatingCosts: RunningCostBlock; // umlagefähig
  nonApportionableOperatingCosts: RunningCostBlock; // nicht umlagefähig
}

export interface RealEstateCostsConfig {
  meta: { country: 'DE'; currency: 'EUR'; version: number; notes?: string };
  purchaseCosts: PurchaseCostsConfig;
  rent: RentTaxesConfig;
  runningCosts: RunningCostsConfig;
}
