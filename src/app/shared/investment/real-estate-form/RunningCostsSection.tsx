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

    // 1. Calculate Total Annual Tax Deductions (Absetzungen)
    const deductionsTotalAnnual = React.useMemo(() => {
      let total = D(0);

      // 1.1 Deductions from CostState (Depreciation, Income-related, Debt Interest, Special Depreciation)
      Object.entries(deductions).forEach(([key, item]) => {
        if (!item.enabled) return;

        // Depreciation ('depreciation', 'specialDepreciation') is on purchase price, others on annual rent
        const isOnPurchasePrice = key === 'depreciation' || key === 'specialDepreciation';
        const base = isOnPurchasePrice ? purchasePrice : annualColdRent;

        let valueAnnual = D(0);
        if (item.mode === 'percent') {
          valueAnnual = base.mul(pctToFrac(item.value));
        } else {
          // mode === 'currency'. Value is now expected to be ANNUAL
          const multiplier = 1; // <--- CHANGED from (isOnPurchasePrice ? 1 : 12) to 1
          valueAnnual = D(normalize(item.value)).mul(multiplier);
        }
        total = total.add(valueAnnual);
      });

      // 1.2 House Fee (Non-Apportionable Part)
      const houseFeeItem = runningCostsSplit.houseFee;
      if (houseFeeItem.enabled) {
        // Calculate the non-apportionable monthly amount first (based on monthly cold rent)
        const totalMonthly =
          houseFeeItem.mode === 'percent'
            ? baseAmount.mul(pctToFrac(houseFeeItem.value1))
            : D(normalize(houseFeeItem.value1));
        const apportionableMonthly =
          houseFeeItem.mode === 'percent'
            ? baseAmount.mul(pctToFrac(houseFeeItem.value2))
            : D(normalize(houseFeeItem.value2));

        const nonApportionableMonthly = totalMonthly.sub(apportionableMonthly);
        total = total.add(nonApportionableMonthly.mul(12)); // Add the annual non-apportionable part
      }

      return total;
    }, [deductions, runningCostsSplit, purchasePrice, annualColdRent, baseAmount]);

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
            ? D(normalize(other.value)) // Assuming currency here means ANNUAL flat amount for tax
            : taxBase.mul(pctToFrac(other.value));
      }

      return incomeTaxAmount
        .add(soliAmount)
        .add(churchTaxAmount ?? D(0))
        .add(otherDeductionsAnnual);
    }, [taxDeductions, taxableRentalIncome]);

    // 3. Calculate Total Monthly Other Running Costs (excluding house fee which is now a tax deduction)
    const otherRunningCostsTotalMonthly = React.useMemo(() => {
      let total = D(0);
      // House Fee split logic REMOVED from here, as it's now in deductions
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
    }, [otherRunningCosts, baseAmount]);

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
                  // Custom label translation key assuming:
                  // depreciation -> Abschreibung, incomeRelatedExpenses -> Werbungskosten,
                  // debtInterest -> Schuldzinsen, specialDepreciation -> Sonderabschreibung
                />
              ))}
              {/* House Fee Split Input - now part of deductions logic */}
              <SplitCostInputRow
                item={runningCostsSplit.houseFee}
                onItemChange={(v) => handleSplitCostChange('houseFee', v)}
                baseAmount={baseAmount} // Monthly cold rent
                currency={currency}
              />
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* EXISTING: Tax Deductions Section (Steuerliche Abzüge) - Now uses Taxable Income as base */}
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
                  baseAmount={taxableRentalIncome} // NEW: Tax base is Taxable Rental Income
                  currency={currency}
                />
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* EXISTING: Other Running Costs Section (Excluding House Fee) */}
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
              {/* Removed SplitCostInputRow for houseFee */}
              {Object.entries(otherRunningCosts).map(([key, item]) => (
                <CostInputRow
                  key={key}
                  item={item}
                  onItemChange={(v) => handleCostChange(setOtherRunningCosts)(key, v)}
                  baseAmount={baseAmount} // Monthly cold rent
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
