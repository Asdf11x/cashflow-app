export type Money = string; // decimal string, computed with decimal.js

export type InvestmentKind = 'REAL_ESTATE' | 'STOCK' | 'OBJECT' | 'FIXED_TERM_DEPOSIT';

export interface BaseInvestment {
  id: string;
  name: string;
  link: string;
  startAmount: Money;
  currency: string;
  kind: InvestmentKind;

  totalPrice: Money;
  netGainMonthly: Money; // output
  netGainYearly: Money; // output
  returnPercent: string; // output, e.g. "3.75"
}

export interface ObjectInvestment extends BaseInvestment {
  kind: 'OBJECT';
  costMonthly: Money;
}

export interface Depositvestment extends BaseInvestment {
  kind: 'FIXED_TERM_DEPOSIT';
  termMonths: number;
  rateNominal: number;
  compounding: 'NONE' | 'YEARLY' | 'MONTHLY';
  withholdingTaxRate?: number;
  taxFreeAllowance?: Money;
  feesAccount?: Money;
}

export interface RunningCostsDeposit {
  incomeTax: Money;
  taxAllowence: Money;
}

export interface RealEstateInvestment extends BaseInvestment {
  kind: 'REAL_ESTATE';
  details: RealEstateInvestmentDetails;
  purchaseCosts: PurchasePriceCosts;
  additionalPurchaseCosts: AdditionalPurchasePriceCosts;

  monthlyColdRent: Money;
  runningCostsRent: RunningCostsRent;
  realEstateDeductions: RealEstateDeductions;
  additionalRunningCostsRent: AdditionalRunningCostsRent;

  totalAdditionalPurchaseCosts: Money;
  totalRunningCostsAnnually: Money;
}

export interface RealEstateInvestmentDetails {
  address: string;
  propertyType: string;
  numberOfFloors: number;
  livingAreaSqm: number;
  usableAreaSqm: number;
  landAreaSqm: number;
  rooms: number;
}

export type PurchasePriceCosts = {
  brokerCommission: Money; // Maklerprovision (optional)
  propertyTransferTax: Money; // Grunderwerbsteuer
  notaryFees: Money; // Notarkosten
  landRegistryFees: Money; // Grundbucheintrag
  total: Money;
};

export type AdditionalPurchasePriceCosts = {
  renovationCosts: Money;
  subvention: Money;
  otherAdditionalCosts: Money;
  appraisalFee: Money;
  insuranceSetup: Money;
  total: Money;
};

export interface RunningCostsRent {
  incomeTax: Money;
  solidaritySurcharge: Money;
  churchTax?: Money;
  otherDeductions?: Money;
  total: Money;
}

export interface RealEstateDeductions {
  depreciation: Money; // Abschreibung
  incomeRelatedExpenses: Money; // Werbungskosten
  debtInterest: Money; // Schuldzinsen
  specialDepreciation: Money; // Sonderabschreibung
  total: Money; // Total annual deductions
}

export interface AdditionalRunningCostsRent {
  houseFee: Money; // This will continue to store the NET value
  houseFeeTotal?: Money; // NEW: Stores the gross Hausgeld amount
  houseFeeApportionable?: Money; // NEW: Stores the apportionable part
  other: Money;
  total: Money;
}

export interface Credit {
  id: string;
  name: string;
  currency: string;

  principal: Money; // Darlehensbetrag
  rateAnnualPercent: string; // Sollzins p.a.
  repaymentMonthly: Money; // Monatliche Tilgung
  termMonths: number; // Gesamtlaufzeit
  startDate?: string; // Für Zeitachsen/Restschuld
  fixedRateYears?: number; // Zinsbindung (optional)
  specialRepaymentYearly?: Money; // Sondertilgung optional

  // optionale Anzeige-/Hilfswerte
  interestMonthly?: Money;
  interestYearly?: Money;
  totalMonthly?: Money; // Rate (Zins + Tilgung)
}

export interface Cashflow {
  id: string;
  name: string;
  investmentId: string;
  creditId: string;
  cashflowMonthly: Money;
}
