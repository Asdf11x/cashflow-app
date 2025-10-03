import Decimal from 'decimal.js';
import type {
  Money,
  RealEstateInvestment,
  PurchasePriceCosts,
  RunningCostsSelection,
} from './types';
import type { RealEstateCostsConfig } from '../../config/costs';
import { getDefaultCostsConfig } from '../../config';

const cfgDefault: RealEstateCostsConfig = getDefaultCostsConfig();
const D = (v: Money | number | string) => new Decimal(v ?? '0');

function fmt(d: Decimal): Money {
  return d.toFixed(2);
}

/** Purchase cost breakdown from config */
export function calcPurchaseCosts(
  purchasePrice: Money,
  cfg: RealEstateCostsConfig = cfgDefault,
  opts?: {
    includeBroker?: boolean;
    includeAppraisal?: boolean;
    includeInsuranceSetup?: boolean;
  },
): PurchasePriceCosts {
  const price = D(purchasePrice);
  const { basicCosts } = cfg.purchaseCosts;

  const items: { key: keyof PurchasePriceCosts; rate?: number; required?: boolean }[] = [
    {
      key: 'brokerCommission',
      rate: basicCosts.brokerCommission.rateOfPurchasePrice,
      required: false,
    },
    {
      key: 'propertyTransferTax',
      rate: basicCosts.propertyTransferTax.rateOfPurchasePrice,
      required: true,
    },
    { key: 'notaryFees', rate: basicCosts.notaryFees.rateOfPurchasePrice, required: true },
    {
      key: 'landRegistryFees',
      rate: basicCosts.landRegistryFees.rateOfPurchasePrice,
      required: true,
    },
    // {
    //   key: 'appraisalFee',
    //   rate: additionalCosts.appraisalFee.rateOfPurchasePrice,
    //   required: false,
    // },
    // {
    //   key: 'insuranceSetup',
    //   rate: additionalCosts.insuranceSetup.rateOfPurchasePrice,
    //   required: false,
    // },
  ];

  const applied: Partial<PurchasePriceCosts> = {};
  let total = new Decimal(0);

  for (const it of items) {
    const include =
      it.required ||
      (it.key === 'brokerCommission' && opts?.includeBroker) ;
      // (it.key === 'appraisalFee' && opts?.includeAppraisal) ||
      // (it.key === 'insuranceSetup' && opts?.includeInsuranceSetup);

    if (include && it.rate) {
      const amount = price.mul(it.rate);
      (applied as any)[it.key] = fmt(amount);
      total = total.add(amount);
    }
  }

  (applied as any).total = fmt(total);
  return applied as PurchasePriceCosts;
}

/** Annual taxes from rent (approximation on gross rent, per your v1 model) */
export function calcRentTaxesAnnual(
  monthlyColdRent: Money,
  cfg: RealEstateCostsConfig = cfgDefault,
  sel: RunningCostsSelection,
) {
  const annualColdRent = D(monthlyColdRent).mul(12);

  let incomeTax = new Decimal(0);
  let soli = new Decimal(0);
  let church = new Decimal(0);

  if (sel.applyIncomeTax) {
    incomeTax = annualColdRent.mul(cfg.rent.taxes.incomeTax.rate);
    if (sel.applySolidarity) {
      soli = incomeTax.mul(cfg.rent.taxes.solidaritySurcharge.rate);
    }
    if (sel.applyChurchTax) {
      church = incomeTax.mul(cfg.rent.taxes.churchTax.rate);
    }
  }

  const netAfterTax = annualColdRent.sub(incomeTax).sub(soli).sub(church);

  return {
    annualColdRent: fmt(annualColdRent),
    incomeTaxAmountAnnual: fmt(incomeTax),
    solidarityAnnual: fmt(soli),
    churchTaxAnnual: fmt(church),
    netRentAfterTaxAnnual: fmt(netAfterTax),
  };
}

/** Annual running costs (umlagefähig / nicht umlagefähig) */
export function calcRunningCostsAnnual(
  monthlyColdRent: Money,
  cfg: RealEstateCostsConfig = cfgDefault,
  sel: RunningCostsSelection,
) {
  const annualColdRent = D(monthlyColdRent).mul(12);

  const calcBlock = (
    mode: RunningCostsSelection['apportionableMode'],
    block: RealEstateCostsConfig['runningCosts']['apportionableOperatingCosts'],
    manual?: Money,
  ): Decimal => {
    if (mode === 'none') return new Decimal(0);
    if (mode === 'manual' && manual) return D(manual);
    return annualColdRent.mul(block.percentageOfAnnualColdRent); // default percentage
  };

  const apportionable = calcBlock(
    sel.apportionableMode,
    cfg.runningCosts.apportionableOperatingCosts,
    sel.manualApportionableAnnual,
  );
  const nonApportionable = calcBlock(
    sel.nonApportionableMode,
    cfg.runningCosts.nonApportionableOperatingCosts,
    sel.manualNonApportionableAnnual,
  );

  const total = apportionable.add(nonApportionable);

  return {
    apportionableAnnual: fmt(apportionable),
    nonApportionableAnnual: fmt(nonApportionable),
    totalRunningCostsAnnual: fmt(total),
  };
}

/**
 * Build/refresh a RealEstateInvestment with all derived outputs.
 * Note: net = (rent after tax) - (owner-only running costs); financing handled elsewhere.
 */
export function buildRealEstateInvestmentOutput(
  base: Omit<
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
  cfg: RealEstateCostsConfig = cfgDefault,
  opts?: { includeBroker?: boolean; includeAppraisal?: boolean; includeInsuranceSetup?: boolean },
): RealEstateInvestment {
  const purchase = calcPurchaseCosts(base.purchasePrice, cfg, opts);
  const rent = calcRentTaxesAnnual(base.monthlyColdRent, cfg, base.runningCostsSelection);
  const run = calcRunningCostsAnnual(base.monthlyColdRent, cfg, base.runningCostsSelection);

  // Simplified profit model per your v1: only owner-borne running costs reduce net
  const netAnnual = D(rent.netRentAfterTaxAnnual).sub(run.nonApportionableAnnual);
  const netMonthly = netAnnual.div(12);

  const totalInvested = D(base.purchasePrice).add(purchase.total);
  const yieldPctYearly = totalInvested.gt(0)
    ? netAnnual.div(totalInvested).mul(100).toFixed(2)
    : '0.00';

  return {
    ...base,
    kind: 'REAL_ESTATE',
    appliedPurchaseCosts: purchase,
    annualColdRent: rent.annualColdRent,
    incomeTaxAmountAnnual: rent.incomeTaxAmountAnnual,
    solidarityAnnual: rent.solidarityAnnual,
    churchTaxAnnual: rent.churchTaxAnnual,
    netRentAfterTaxAnnual: rent.netRentAfterTaxAnnual,
    apportionableAnnual: run.apportionableAnnual,
    nonApportionableAnnual: run.nonApportionableAnnual,
    totalRunningCostsAnnual: run.totalRunningCostsAnnual,
    netGainMonthly: fmt(netMonthly),
    netGainYearly: fmt(netAnnual),
    yieldPctYearly,
  };
}
