export type Money = string; // decimal string, computed with decimal.js

export type InvestmentKind = 'OBJECT' | 'REAL_ESTATE' | 'STOCK';

export interface BaseInvestment {
  id: string;
  name: string;
  kind: InvestmentKind;

  netGainMonthly: Money; // output
  netGainYearly: Money; // output
  yieldPctYearly: string; // output, e.g. "3.75"
}

export interface ObjectInvestment extends BaseInvestment {
  kind: 'OBJECT';
  purchasePrice: Money;
  grossGainMonthly: Money;
  costMonthly: Money;
}

export type PurchasePriceExtraCosts = {
  // store the *applied* amounts (not rates) after calculation, as Money
  brokerCommission?: Money; // Maklerprovision (optional)
  propertyTransferTax: Money; // Grunderwerbsteuer
  notaryFees: Money; // Notarkosten
  landRegistryFees: Money; // Grundbucheintrag
  appraisalFee?: Money; // Gutachterkosten (optional)
  insuranceSetup?: Money; // Versicherungs-Setup (optional)
  total: Money;
};

export interface RunningCostsSelection {
  // how user chose to compute each block
  apportionableMode: 'percentage' | 'manual' | 'none';
  nonApportionableMode: 'percentage' | 'manual' | 'none';
  manualApportionableAnnual?: Money; // if mode = manual
  manualNonApportionableAnnual?: Money; // if mode = manual
  applyIncomeTax: boolean;
  applySolidarity: boolean;
  applyChurchTax: boolean;
}

export interface RealEstateInvestment extends BaseInvestment {
  kind: 'REAL_ESTATE';
  purchasePrice: Money;

  // RENT INPUTS
  monthlyColdRent: Money; // "Miete (Kaltmiete)" as input
  runningCostsSelection: RunningCostsSelection;

  // CALCULATED FROM CONFIG
  appliedPurchaseCosts: PurchasePriceExtraCosts;

  // RENT / COSTS OUTPUTS (derived)
  annualColdRent: Money;
  incomeTaxAmountAnnual: Money;
  solidarityAnnual: Money;
  churchTaxAnnual: Money;
  netRentAfterTaxAnnual: Money;

  apportionableAnnual: Money; // umlagefähig (usually tenant pays)
  nonApportionableAnnual: Money; // nicht umlagefähig (owner)
  totalRunningCostsAnnual: Money;
}

export interface Credit {
  id: string;
  name: string;
  principal: Money; // Kredithöhe
  equity: Money; // Eigenkapital
  rateAnnualPct: string; // Zinssatz p.a. in %
  amortMonthly: Money; // Tilgung pro Monat

  // derived
  interestMonthly: Money;
  interestYearly: Money;
}

export interface Cashflow {
  id: string;
  name: string;
  investmentId: string;
  creditId: string;
  cashflowMonthly: Money; // computed
}
