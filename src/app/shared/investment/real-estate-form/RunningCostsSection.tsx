import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Stack,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Decimal from 'decimal.js';
import type { CostItemState, CostState } from '../formHelpers';
import { D, normalize, pctToFrac } from '../formHelpers';
import { CostInputRow, SplitCostInputRow, type SplitCostItemState } from './CostInputs';
import { fmtMoney } from '../../../../core/domain/calc';

// --- Main Running Costs Section Component ---
interface RunningCostsSectionProps {
  baseAmount: Decimal; // Monthly cold rent
  purchasePrice: Decimal; // NEW: Initial purchase price for depreciation/special depreciation
  currency: string;
  initialStates: {
    initialDeductionsStates: {
      // NEW wrapper
      deductions: CostState;
      runningCostsSplit: { houseFee: SplitCostItemState };
    };
    taxDeductions: CostState;
    otherRunningCosts: CostState;
  };
  onTotalChange: (total: Decimal) => void; // Reports total annual running costs
}

export type RunningCostsSectionHandle = {
  getData: () => {
    deductions: CostState;
    runningCostsSplit: { houseFee: SplitCostItemState };
    taxDeductions: CostState;
    otherRunningCosts: CostState;
  };
};

const RunningCostsSection = React.forwardRef<RunningCostsSectionHandle, RunningCostsSectionProps>(
  ({ baseAmount, purchasePrice, currency, initialStates, onTotalChange }, ref) => {
    const { t } = useTranslation();

    // NEW STATES for Deductions
    const [deductions, setDeductions] = React.useState<CostState>(
      initialStates.initialDeductionsStates.deductions,
    );
    const [runningCostsSplit, setRunningCostsSplit] = React.useState(
      initialStates.initialDeductionsStates.runningCostsSplit,
    );

    // EXISTING STATES
    const [taxDeductions, setTaxDeductions] = React.useState<CostState>(
      initialStates.taxDeductions,
    );
    const [otherRunningCosts, setOtherRunningCosts] = React.useState<CostState>(
      initialStates.otherRunningCosts,
    );

    React.useEffect(() => {
      // Update deductions states
      setDeductions(initialStates.initialDeductionsStates.deductions);
      setRunningCostsSplit(initialStates.initialDeductionsStates.runningCostsSplit);

      setTaxDeductions(initialStates.taxDeductions);
      setOtherRunningCosts(initialStates.otherRunningCosts);
    }, [initialStates]);

    const annualColdRent = baseAmount.mul(12);

    const handleCostChange =
      (setState: React.Dispatch<React.SetStateAction<CostState>>) =>
      (key: string, newValues: Partial<CostItemState>) => {
        setState((prev) => ({ ...prev, [key]: { ...prev[key], ...newValues } }));
      };
    const handleSplitCostChange = (
      key: keyof typeof runningCostsSplit,
      newValues: Partial<SplitCostItemState>,
    ) => {
      setRunningCostsSplit((prev) => ({ ...prev, [key]: { ...prev[key], ...newValues } }));
    };

    // --- NEW: Centralized calculation for the non-apportionable house fee ---
    const nonApportionableMonthlyHouseFee = React.useMemo(() => {
      const houseFeeItem = runningCostsSplit.houseFee;
      if (!houseFeeItem.enabled) {
        return D(0);
      }

      const totalMonthlyHouseFee =
        houseFeeItem.mode === 'percent'
          ? baseAmount.mul(pctToFrac(houseFeeItem.value1))
          : D(normalize(houseFeeItem.value1));

      const isPercentMode = houseFeeItem.mode === 'percent';
      let apportionableMonthly: Decimal;
      if (isPercentMode) {
        // value2 is a percentage of the total house fee (totalMonthlyHouseFee)
        apportionableMonthly = totalMonthlyHouseFee.mul(pctToFrac(houseFeeItem.value2));
      } else {
        // value2 is an absolute currency amount
        apportionableMonthly = D(normalize(houseFeeItem.value2));
      }

      // Non-Apportionable Part = Total House Fee - Apportionable Part
      const nonApportionableMonthly = totalMonthlyHouseFee.sub(apportionableMonthly);
      // Ensure the result is not negative
      return nonApportionableMonthly.gte(0) ? nonApportionableMonthly : D(0);
    }, [runningCostsSplit.houseFee, baseAmount]);

    // 1. Calculate Total Annual Tax Deductions (Absetzungen)
    const deductionsTotalAnnual = React.useMemo(() => {
      let total = D(0);

      // 1.1 Deductions from CostState (Depreciation, Income-related, Debt Interest, Special Depreciation)
      Object.entries(deductions).forEach(([key, item]) => {
        if (!item.enabled) return;

        const isOnPurchasePrice = key === 'depreciation' || key === 'specialDepreciation';
        const base = isOnPurchasePrice ? purchasePrice : annualColdRent;

        let valueAnnual = D(0);
        if (item.mode === 'percent') {
          valueAnnual = base.mul(pctToFrac(item.value));
        } else {
          const multiplier = 1;
          valueAnnual = D(normalize(item.value)).mul(multiplier);
        }
        total = total.add(valueAnnual);
      });

      // 1.2 House Fee (Non-Apportionable Part)
      // Use the pre-calculated monthly value and multiply by 12 for the annual deduction
      total = total.add(nonApportionableMonthlyHouseFee.mul(12));

      return total;
    }, [deductions, nonApportionableMonthlyHouseFee, purchasePrice, annualColdRent]);

    // Calculate the Taxable Rental Income (Tax Base)
    const taxableRentalIncome = annualColdRent.sub(deductionsTotalAnnual);

    // 2. Calculate Total Annual Tax Costs (Steuerliche Abzüge) - Now based on Taxable Income
    const taxCostsTotalAnnual = React.useMemo(() => {
      if (taxableRentalIncome.lte(0)) return D(0);

      const taxBase = taxableRentalIncome;

      const incomeTaxAmount = taxDeductions.incomeTax.enabled
        ? taxBase.mul(pctToFrac(taxDeductions.incomeTax.value))
        : D(0);
      const soliAmount = taxDeductions.solidaritySurcharge.enabled
        ? incomeTaxAmount.mul(pctToFrac(taxDeductions.solidaritySurcharge.value))
        : D(0);
      const churchTaxAmount = taxDeductions.churchTax?.enabled
        ? incomeTaxAmount.mul(pctToFrac(taxDeductions.churchTax.value))
        : D(0);

      const other = taxDeductions.otherDeductions;
      let otherDeductionsAnnual = D(0);
      if (other?.enabled) {
        otherDeductionsAnnual =
          other.mode === 'currency'
            ? D(normalize(other.value))
            : taxBase.mul(pctToFrac(other.value));
      }

      return incomeTaxAmount
        .add(soliAmount)
        .add(churchTaxAmount ?? D(0))
        .add(otherDeductionsAnnual);
    }, [taxDeductions, taxableRentalIncome]);

    // 3. Calculate Total Monthly Other Running Costs (NOW including the non-apportionable house fee)
    const otherRunningCostsTotalMonthly = React.useMemo(() => {
      // Start with the non-apportionable part of the house fee
      let total = nonApportionableMonthlyHouseFee;

      // Add the other running costs
      Object.values(otherRunningCosts).forEach((cost) => {
        if (cost.enabled) {
          const value =
            cost.mode === 'percent'
              ? baseAmount.mul(pctToFrac(cost.value))
              : D(normalize(cost.value)); // Monthly currency amount
          total = total.add(value);
        }
      });
      return total;
    }, [otherRunningCosts, baseAmount, nonApportionableMonthlyHouseFee]);

    // Report Total Annual Running Costs (Tax Costs + Other Running Costs Annual)
    React.useEffect(() => {
      const otherCostsAnnual = otherRunningCostsTotalMonthly.mul(12);
      const totalAnnual = taxCostsTotalAnnual.add(otherCostsAnnual);
      onTotalChange(totalAnnual);
    }, [taxCostsTotalAnnual, otherRunningCostsTotalMonthly, onTotalChange]);

    // Expose a function for the parent to get the final state
    React.useImperativeHandle(ref, () => ({
      getData: () => ({
        deductions,
        runningCostsSplit,
        taxDeductions,
        otherRunningCosts,
      }),
    }));

    // --- NEW: Prepare a read-only item for display in the "Other Running Costs" section ---
    const nonApportionableHouseFeeItemForDisplay: CostItemState = {
      enabled: true, // Always show the row
      // --- MODIFIED LINE: Rounds to 2 decimal places and removes trailing .00 ---
      value: nonApportionableMonthlyHouseFee.toDP(2).toString(),
      mode: 'currency',
      allowModeChange: false,
      label: t('realEstateForm.runningCosts.nonApportionableHouseFee'),
    };

    return (
      <>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 2 }}>
              <Typography fontWeight={700}>{t('realEstateForm.accordions.deductions')}</Typography>
              <Typography color="text.secondary">
                {t('realEstateForm.accordionSummary.deductionMonthlyLabel')}:{' '}
                {fmtMoney(deductionsTotalAnnual.div(12).toFixed(0))} {currency}
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              {Object.entries(deductions).map(([key, item]) => (
                <CostInputRow
                  key={key}
                  item={item}
                  onItemChange={(v) => handleCostChange(setDeductions)(key, v)}
                  baseAmount={
                    key === 'depreciation' || key === 'specialDepreciation'
                      ? purchasePrice
                      : annualColdRent
                  }
                  currency={currency}
                />
              ))}
              <SplitCostInputRow
                item={runningCostsSplit.houseFee}
                onItemChange={(v) => handleSplitCostChange('houseFee', v)}
                baseAmount={baseAmount}
                currency={currency}
              />
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 2 }}>
              <Typography fontWeight={700}>
                {t('realEstateForm.accordions.taxDeductions')}
              </Typography>
              <Typography color="text.secondary">
                {fmtMoney(taxCostsTotalAnnual.div(12).toFixed(0))} {currency}
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              {Object.entries(taxDeductions).map(([key, item]) => (
                <CostInputRow
                  key={key}
                  item={item}
                  onItemChange={(v) => handleCostChange(setTaxDeductions)(key, v)}
                  baseAmount={taxableRentalIncome}
                  currency={currency}
                />
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* --- MODIFIED: Other Running Costs Section --- */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 2 }}>
              <Typography fontWeight={700}>
                {t('realEstateForm.accordions.otherRunningCosts')}
              </Typography>
              <Typography color="text.secondary">
                {fmtMoney(otherRunningCostsTotalMonthly.toFixed(0))} {currency}
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              {/* --- NEW: Display the non-editable, calculated house fee --- */}
              <CostInputRow
                key="non-apportionable-house-fee"
                item={nonApportionableHouseFeeItemForDisplay}
                onItemChange={() => {}} // No-op function as it cannot be changed here
                baseAmount={baseAmount} // Not used for currency mode, but required by prop
                currency={currency}
                disabled // This is the crucial new prop
              />

              {/* Existing "other" costs */}
              {Object.entries(otherRunningCosts).map(([key, item]) => (
                <CostInputRow
                  key={key}
                  item={item}
                  onItemChange={(v) => handleCostChange(setOtherRunningCosts)(key, v)}
                  baseAmount={baseAmount}
                  currency={currency}
                />
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>
      </>
    );
  },
);

export default RunningCostsSection;
