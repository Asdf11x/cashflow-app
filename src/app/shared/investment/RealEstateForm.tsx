import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Stack,
  Divider,
  TextField,
  InputAdornment,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import Decimal from 'decimal.js';
import { D, normalize, sanitizeDecimal, type CostState, pctToFrac } from './formHelpers';
import { useInvestStore } from '../../../core/state/useInvestStore';
import type {
  AdditionalPurchasePriceCosts,
  AdditionalRunningCostsRent,
  PurchasePriceCosts,
  RealEstateInvestment,
  RunningCostsRent,
  RealEstateDeductions, // Import NEW type
} from '../../../core/domain/types';
import FormHeader from './real-estate-form/FormHeader';
import PurchaseCostsSection, {
  type PurchaseCostsSectionHandle,
} from './real-estate-form/PurchaseCostsSection';
import RunningCostsSection, {
  type RunningCostsSectionHandle,
} from './real-estate-form/RunningCostsSection';
import SummarySection from './real-estate-form/SummarySection';
import { useDefaults } from '../../../core/hooks/useDefaults.ts';

export type SplitCostItemState = {
  enabled: boolean;
  value1: string;
  value2: string;
  mode: 'percent' | 'currency';
  allowModeChange: boolean;
  label1: string;
  label2: string;
};

// Helper function to calculate the total annual deductions
const calculateDeductionCostStateTotal = (
  costState: CostState,
  purchasePriceBase: Decimal,
  annualRentBase: Decimal,
  houseFeeSplit: { houseFee: SplitCostItemState },
): Decimal => {
  let total = D(0);

  Object.entries(costState).forEach(([key, item]) => {
    if (!item.enabled) return;

    // Depreciation ('depreciation', 'specialDepreciation') is on purchase price, others on annual rent
    const isOnPurchasePrice = key === 'depreciation' || key === 'specialDepreciation';
    const base = isOnPurchasePrice ? purchasePriceBase : annualRentBase;

    let valueAnnual = D(0);
    if (item.mode === 'percent') {
      valueAnnual = base.mul(pctToFrac(item.value));
    } else {
      // mode === 'currency'
      // All currency inputs in this section are now assumed to be ANNUAL
      const multiplier = 1; // <--- CHANGED from (isOnPurchasePrice ? 1 : 12) to 1
      valueAnnual = D(normalize(item.value)).mul(multiplier);
    }
    total = total.add(valueAnnual);
  });

  // House Fee (Non-Apportionable Part) - now part of tax deductions
  const houseFeeItem = houseFeeSplit.houseFee;
  if (houseFeeItem.enabled) {
    const monthlyRentBase = annualRentBase.div(12);

    const totalMonthly =
      houseFeeItem.mode === 'percent'
        ? monthlyRentBase.mul(pctToFrac(houseFeeItem.value1))
        : D(normalize(houseFeeItem.value1));
    const apportionableMonthly =
      houseFeeItem.mode === 'percent'
        ? monthlyRentBase.mul(pctToFrac(houseFeeItem.value2))
        : D(normalize(houseFeeItem.value2));

    const nonApportionableMonthly = totalMonthly.sub(apportionableMonthly);
    total = total.add(nonApportionableMonthly.mul(12)); // Add the annual non-apportionable part
  }
  return total;
};

// Helper function to calculate total tax costs on a specific base
const calculateTaxCostStateTotal = (costState: CostState, taxBase: Decimal): Decimal => {
  if (taxBase.lte(0)) return D(0);

  const incomeTax = costState.incomeTax;
  const soli = costState.solidaritySurcharge;
  const churchTax = costState.churchTax;
  const other = costState.otherDeductions;

  const incomeTaxAmount = incomeTax.enabled ? taxBase.mul(pctToFrac(incomeTax.value)) : D(0);
  const soliAmount = soli.enabled ? incomeTaxAmount.mul(pctToFrac(soli.value)) : D(0);
  const churchTaxAmount = churchTax?.enabled
    ? incomeTaxAmount.mul(pctToFrac(churchTax.value))
    : D(0);

  let otherDeductionsAnnual = D(0);
  if (other?.enabled) {
    otherDeductionsAnnual =
      other.mode === 'currency'
        ? D(normalize(other.value)) // Assuming currency here means ANNUAL flat amount for tax
        : taxBase.mul(pctToFrac(other.value));
  }

  return incomeTaxAmount
    .add(soliAmount)
    .add(churchTaxAmount ?? D(0))
    .add(otherDeductionsAnnual);
};

const RealEstateForm = React.forwardRef(
  (
    {
      onClose,
      existingNames,
      editId,
    }: { onClose: () => void; existingNames: string[]; editId?: string },
    ref,
  ) => {
    const { t } = useTranslation();
    const { addRealEstate, updateRealEstate, realEstates } = useInvestStore();
    const defaults = useDefaults();
    const { currency: metaCurrency } = defaults.meta;

    const existingInvestment = React.useMemo(
      () => (editId ? realEstates.find((inv) => inv.id === editId) : undefined),
      [editId, realEstates],
    );

    const purchaseCostsRef = React.useRef<PurchaseCostsSectionHandle>(null);
    const runningCostsRef = React.useRef<RunningCostsSectionHandle>(null);

    const reDefaults = defaults.investments.realEstate;

    const [rName, setRName] = React.useState('');
    const [rPurchasePrice, setRPurchasePrice] = React.useState('');
    const [rCurrency, setRCurrency] = React.useState('');
    const [rMonthlyColdRent, setRMonthlyColdRent] = React.useState('');
    const [rDetailsLink, setRDetailsLink] = React.useState('');

    React.useEffect(() => {
      setRName(existingInvestment?.name || t(reDefaults.basic.name.i18nKey));
      setRPurchasePrice(existingInvestment?.startAmount || reDefaults.basic.purchasePrice);
      setRCurrency(existingInvestment?.currency || metaCurrency);
      setRMonthlyColdRent(existingInvestment?.monthlyColdRent || reDefaults.basic.monthlyColdRent);
      setRDetailsLink(existingInvestment?.link || '');
    }, [existingInvestment, metaCurrency, reDefaults, t]);

    const { initialPurchaseStates, initialRunningStates } = React.useMemo(() => {
      const mapDefaultsToCostState = (
        defaultCosts: Record<string, any>,
        savedCosts?: Record<string, string | undefined>,
      ): CostState =>
        Object.fromEntries(
          Object.entries(defaultCosts).map(([key, def]) => {
            const savedValue = savedCosts?.[key as keyof typeof savedCosts];
            const isEnabled = savedValue !== undefined ? D(savedValue).gt(0) : def.enabled;
            return [
              key,
              {
                enabled: isEnabled,
                value: savedValue !== undefined ? savedValue : String(def.value),
                mode: def.mode,
                allowModeChange: def.allowModeChange,
                label: t(def.i18nKey),
              },
            ];
          }),
        );

      const purchaseStates = {
        purchaseCosts: mapDefaultsToCostState(
          reDefaults.purchaseCosts.basic,
          existingInvestment?.purchaseCosts as Record<string, string> | undefined,
        ),
        additionalCosts: mapDefaultsToCostState(
          reDefaults.purchaseCosts.additional,
          existingInvestment?.additionalPurchaseCosts as Record<string, string> | undefined,
        ),
      };

      const deductionsStates = mapDefaultsToCostState(
        reDefaults.deductions, // Assumes reDefaults.deductions exists
        existingInvestment?.realEstateDeductions as Record<string, string> | undefined,
      );

      const houseFeeSplitState = {
        houseFee: {
          enabled: existingInvestment?.additionalRunningCostsRent?.houseFeeTotal
            ? D(existingInvestment.additionalRunningCostsRent.houseFeeTotal).gt(0)
            : reDefaults.runningCosts.additional.houseFee.enabled,
          value1:
            existingInvestment?.additionalRunningCostsRent?.houseFeeTotal ||
            reDefaults.runningCosts.additional.houseFee.value1,
          value2:
            existingInvestment?.additionalRunningCostsRent?.houseFeeApportionable ||
            reDefaults.runningCosts.additional.houseFee.value2,
          mode: reDefaults.runningCosts.additional.houseFee.mode,
          allowModeChange: reDefaults.runningCosts.additional.houseFee.allowModeChange,
          label1: t(reDefaults.runningCosts.additional.houseFee.i18nKeyTotal),
          label2: t(reDefaults.runningCosts.additional.houseFee.i18nKeyApportionable),
        } as SplitCostItemState,
      };
      // END NEW: Deductions State

      const runningStates = {
        taxDeductions: mapDefaultsToCostState(
          reDefaults.runningCosts.rentTaxes,
          existingInvestment?.runningCostsRent as Record<string, string> | undefined,
        ),
        otherRunningCosts: mapDefaultsToCostState(
          { other: reDefaults.runningCosts.additional.other },
          existingInvestment?.additionalRunningCostsRent as Record<string, string> | undefined,
        ),
      };

      return {
        initialPurchaseStates: purchaseStates,
        initialRunningStates: {
          taxDeductions: runningStates.taxDeductions,
          otherRunningCosts: runningStates.otherRunningCosts,
          initialDeductionsStates: {
            // NEW wrapper for Deductions
            deductions: deductionsStates,
            runningCostsSplit: houseFeeSplitState,
          },
        },
      };
    }, [existingInvestment, reDefaults, t]);

    const [totalPurchaseSideCosts, setTotalPurchaseSideCosts] = React.useState(D(0));
    const [totalRunningCostsAnnual, setTotalRunningCostsAnnual] = React.useState(D(0));
    const [isNameTouched, setIsNameTouched] = React.useState(false);
    const [isPriceTouched, setIsPriceTouched] = React.useState(false);

    const rPurchasePriceD = D(normalize(rPurchasePrice));
    const rMonthlyColdRentD = D(normalize(rMonthlyColdRent));
    const annualColdRent = rMonthlyColdRentD.mul(12); // NEW variable

    const grandTotalPrice = rPurchasePriceD.add(totalPurchaseSideCosts);
    const netRentAnnual = annualColdRent.sub(totalRunningCostsAnnual); // Updated logic: Total Running Costs now includes Tax Costs
    const netRentMonthly = netRentAnnual.div(12);
    const yieldPct = grandTotalPrice.gt(0)
      ? netRentAnnual.div(grandTotalPrice).mul(100).toDP(2).toString()
      : '0';

    const purchasePriceError = rPurchasePriceD.lte(0);
    const trimmedName = rName.trim();
    const nameError = !trimmedName || existingNames.includes(trimmedName);
    const nameHelperText = !trimmedName
      ? t('realEstateForm.nameHelperEmpty')
      : existingNames.includes(trimmedName)
        ? t('realEstateForm.nameHelperInUse')
        : ' ';
    const priceHelperText =
      isPriceTouched && purchasePriceError ? t('realEstateForm.purchasePriceHelper') : ' ';

    const calculateCostStateTotal = (costState: CostState, base: Decimal): Decimal => {
      return Object.values(costState).reduce((acc, item) => {
        if (item.enabled && item.value) {
          const value =
            item.mode === 'percent' ? base.mul(D(item.value).div(100)) : D(normalize(item.value));
          return acc.add(value);
        }
        return acc;
      }, D(0));
    };

    React.useImperativeHandle(ref, () => ({
      isValid: () => !purchasePriceError && !nameError,
      submit: () => {
        setIsPriceTouched(true);
        setIsNameTouched(true);
        if (purchasePriceError || nameError) return;

        const purchaseData = purchaseCostsRef.current?.getData();
        const runningData = runningCostsRef.current?.getData();

        if (!purchaseData || !runningData) {
          console.error('Child component data is not available.');
          return;
        }

        const transformCostState = (state: CostState): Record<string, string> =>
          Object.fromEntries(
            Object.entries(state).map(([key, item]) => [
              key,
              item.enabled ? normalize(item.value) : '0',
            ]),
          );

        const purchaseCostsObject = transformCostState(
          purchaseData.purchaseCosts,
        ) as unknown as PurchasePriceCosts;
        purchaseCostsObject.total = calculateCostStateTotal(
          purchaseData.purchaseCosts,
          rPurchasePriceD,
        ).toString();

        const additionalPurchaseCostsObject = transformCostState(
          purchaseData.additionalCosts,
        ) as unknown as AdditionalPurchasePriceCosts;
        additionalPurchaseCostsObject.total = calculateCostStateTotal(
          purchaseData.additionalCosts,
          rPurchasePriceD,
        ).toString();

        // NEW: Deductions object
        const totalDeductionsAnnualActual = calculateDeductionCostStateTotal(
          runningData.deductions,
          rPurchasePriceD,
          annualColdRent,
          runningData.runningCostsSplit,
        );

        const realEstateDeductionsObject = transformCostState(
          runningData.deductions,
        ) as unknown as Omit<RealEstateDeductions, 'total'>;

        const realEstateDeductionsFinal: RealEstateDeductions = {
          ...realEstateDeductionsObject,
          total: totalDeductionsAnnualActual.toString(),
        };
        // END NEW: Deductions object

        // Taxable Income (Rent - Deductions)
        const taxableIncome = annualColdRent.sub(totalDeductionsAnnualActual);

        // Running Costs Rent (Tax Costs) object - now based on Taxable Income
        const runningCostsRentObject = transformCostState(
          runningData.taxDeductions,
        ) as unknown as RunningCostsRent;
        runningCostsRentObject.total = calculateTaxCostStateTotal(
          runningData.taxDeductions,
          taxableIncome,
        ).toString();

        // Other Running Costs (House Fee logic is now simpler here as the split is done in deductions)
        const otherRunningCostsValue = runningData.otherRunningCosts.other.enabled
          ? normalize(runningData.otherRunningCosts.other.value)
          : '0';

        // House Fee total/apportionable parts are still stored in additionalRunningCostsRent
        const houseFeeTotalValue = runningData.runningCostsSplit.houseFee.enabled
          ? normalize(runningData.runningCostsSplit.houseFee.value1)
          : '0';
        const houseFeeApportionableValue = runningData.runningCostsSplit.houseFee.enabled
          ? normalize(runningData.runningCostsSplit.houseFee.value2)
          : '0';

        const nonApportionableMonthly = D(houseFeeTotalValue).sub(D(houseFeeApportionableValue));

        const additionalRunningCostsRentObject: AdditionalRunningCostsRent = {
          houseFee: nonApportionableMonthly.toString(), // Net part (Total - Apportionable)
          houseFeeTotal: houseFeeTotalValue,
          houseFeeApportionable: houseFeeApportionableValue,
          other: otherRunningCostsValue,
          // Total MONTHLY other running costs (Non-apportionable house fee + other)
          total: D(normalize(otherRunningCostsValue)).add(nonApportionableMonthly).toString(),
        };

        const investmentData: RealEstateInvestment = {
          id: editId || `re_${crypto.randomUUID()}`,
          kind: 'REAL_ESTATE',
          name: trimmedName,
          currency: rCurrency,
          link: rDetailsLink,
          startAmount: normalize(rPurchasePrice),
          totalPrice: grandTotalPrice.toString(),
          netGainMonthly: netRentMonthly.toString(),
          netGainYearly: netRentAnnual.toString(),
          returnPercent: yieldPct,
          monthlyColdRent: normalize(rMonthlyColdRent),
          totalAdditionalPurchaseCosts: additionalPurchaseCostsObject.total,
          totalRunningCostsAnnually: totalRunningCostsAnnual.toString(),
          purchaseCosts: purchaseCostsObject,
          additionalPurchaseCosts: additionalPurchaseCostsObject,
          runningCostsRent: runningCostsRentObject,
          additionalRunningCostsRent: additionalRunningCostsRentObject,
          realEstateDeductions: realEstateDeductionsFinal, // <--- ADDED
          details: existingInvestment?.details || {
            address: '',
            propertyType: '',
            numberOfFloors: 0,
            livingAreaSqm: 0,
            usableAreaSqm: 0,
            landAreaSqm: 0,
            rooms: 0,
          },
        };

        if (editId) {
          updateRealEstate(investmentData);
        } else {
          addRealEstate(investmentData);
        }

        onClose();
      },
    }));

    const handlePurchaseTotalChange = React.useCallback((newTotal: Decimal) => {
      setTotalPurchaseSideCosts((current) => (current.equals(newTotal) ? current : newTotal));
    }, []);

    const handleRunningTotalChange = React.useCallback((newTotal: Decimal) => {
      setTotalRunningCostsAnnual((current) => (current.equals(newTotal) ? current : newTotal));
    }, []);

    return (
      <Stack spacing={3} sx={{ mt: 1 }}>
        <FormHeader
          name={rName}
          onNameChange={(e) => setRName(e.target.value)}
          onNameBlur={() => setIsNameTouched(true)}
          isNameTouched={isNameTouched}
          nameError={nameError}
          nameHelperText={nameHelperText}
          purchasePrice={rPurchasePrice}
          onPurchasePriceChange={(e) => setRPurchasePrice(sanitizeDecimal(e.target.value))}
          onPurchasePriceBlur={() => setIsPriceTouched(true)}
          isPriceTouched={isPriceTouched}
          priceError={purchasePriceError}
          priceHelperText={priceHelperText}
          currency={rCurrency}
          onCurrencyChange={(e: SelectChangeEvent) => setRCurrency(e.target.value as string)}
          link={rDetailsLink}
          onLinkChange={(e) => setRDetailsLink(e.target.value)}
          isEditing={!!editId}
        />

        <PurchaseCostsSection
          key={editId || 'new-purchase'}
          ref={purchaseCostsRef}
          baseAmount={rPurchasePriceD}
          currency={rCurrency}
          initialStates={initialPurchaseStates}
          onTotalChange={handlePurchaseTotalChange}
        />

        <Divider />

        <TextField
          label={t('realEstateForm.monthlyColdRentLabel')}
          value={rMonthlyColdRent}
          onChange={(e) => setRMonthlyColdRent(sanitizeDecimal(e.target.value))}
          fullWidth
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Typography>{rCurrency}</Typography>
              </InputAdornment>
            ),
          }}
        />

        <RunningCostsSection
          key={editId ? `${editId}-running` : 'new-running'}
          ref={runningCostsRef}
          baseAmount={rMonthlyColdRentD}
          purchasePrice={rPurchasePriceD} // <--- NEW PROP
          currency={rCurrency}
          initialStates={initialRunningStates}
          onTotalChange={handleRunningTotalChange}
        />

        <SummarySection
          currency={rCurrency}
          totalPurchaseSideCosts={totalPurchaseSideCosts}
          grandTotalPrice={grandTotalPrice}
          netRentMonthly={netRentMonthly}
          netRentAnnual={netRentAnnual}
          yieldPct={yieldPct}
        />
      </Stack>
    );
  },
);

export default RealEstateForm;
