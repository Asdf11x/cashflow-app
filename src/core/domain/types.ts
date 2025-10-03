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

export type PurchasePriceCosts = {
  // store the *applied* amounts (not rates) after calculation, as Money
  renovationCost: Money;
  brokerCommission?: Money; // Maklerprovision (optional)
  propertyTransferTax: Money; // Grunderwerbsteuer
  notaryFees: Money; // Notarkosten
  landRegistryFees: Money; // Grundbucheintrag
  total: Money;
};

export type PurchasePriceAdditionalCosts = {
  // store the *applied* amounts (not rates) after calculation, as Money
  subvention: Money; // only value which doesnt subtract but adds
  additionalCosts: Money; // free field of adding percentage or fixed value "zusätzliche kosten"
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

export interface RealEstateInvestmentDetails {
  link: string;
  address: string;
  type: string;                // "Doppelhaushälfte" -> e.g. "semi-detached house"
  numberOfFloors: number;      // Etagenanzahl
  livingAreaSqm: number;       // Wohnfläche ca. (m², can be fractional)
  usableAreaSqm: number;       // Nutzfläche ca. (m², can be fractional)
  landAreaSqm: number;         // Grundstück ca. (m², usually whole number but keep decimal safe)
  rooms: number;               // Zimmer
}

export interface RealEstateInvestmentCalculatedDetails {
  squareMeterPrice: Money;
}

export interface RealEstateInvestment extends BaseInvestment {
  kind: 'REAL_ESTATE';
  purchasePrice: Money;
  details: RealEstateInvestmentDetails;

  // RENT INPUTS
  monthlyColdRent: Money; // "Miete (Kaltmiete)" as input
  runningCostsSelection: RunningCostsSelection;

  // CALCULATED FROM CONFIG
  appliedPurchaseCosts: PurchasePriceCosts;

  // RENT / COSTS OUTPUTS (derived)
  annualColdRent: Money;
  incomeTaxAmountAnnual: Money;
  solidarityAnnual: Money;
  churchTaxAnnual: Money;
  netRentAfterTaxAnnual: Money;

  apportionableAnnual: Money; // kick out we dont need as the renter pays, we dont care
  nonApportionableAnnual: Money;
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
