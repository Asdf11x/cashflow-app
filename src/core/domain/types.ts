export type Money = string; // Dezimal-String (Rechnen mit decimal.js)

export interface BaseInvestment {
  id: string;
  name: string;
  kind: 'OBJECT' | 'REAL_ESTATE' | 'STOCK';

  netGainMonthly: Money; // Netto-Gewinn pro Monat
  netGainYearly: Money; // Netto-Gewinn pro Jahr
  yieldPctYearly: string; // Rendite in %
}

// MVP: nur OBJECT
export interface Objectvestment extends BaseInvestment {
  kind: 'OBJECT';
  purchasePrice: Money; // Kaufpreis
  grossGainMonthly: Money; // Gewinn (brutto) pro Monat
  costMonthly: Money; // Kosten/Verlust pro Monat
}

export type Investment = Objectvestment;

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
