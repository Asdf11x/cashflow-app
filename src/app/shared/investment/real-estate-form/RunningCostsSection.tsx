// src/components/shared/investment/real-estate-form/RunningCostsSection.tsx

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
  currency: string;
  initialStates: {
    taxDeductions: CostState;
    runningCostsSplit: { houseFee: SplitCostItemState };
    otherRunningCosts: CostState;
  };
  onTotalChange: (total: Decimal) => void; // Reports total annual running costs
  onStateChange: (states: RunningCostsSectionProps['initialStates']) => void;
}

export default function RunningCostsSection({
  baseAmount,
  currency,
  initialStates,
  onTotalChange,
  onStateChange,
}: RunningCostsSectionProps) {
  const { t } = useTranslation();
  const [taxDeductions, setTaxDeductions] = React.useState<CostState>(initialStates.taxDeductions);
  const [runningCostsSplit, setRunningCostsSplit] = React.useState(initialStates.runningCostsSplit);
  const [otherRunningCosts, setOtherRunningCosts] = React.useState<CostState>(
    initialStates.otherRunningCosts,
  );

  const annualBaseAmount = baseAmount.mul(12);

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

  const deductionsTotalAnnual = React.useMemo(() => {
    const incomeTaxAmount = taxDeductions.incomeTax.enabled
      ? annualBaseAmount.mul(pctToFrac(taxDeductions.incomeTax.value))
      : D(0);
    const soliAmount = taxDeductions.solidaritySurcharge.enabled
      ? incomeTaxAmount.mul(pctToFrac(taxDeductions.solidaritySurcharge.value))
      : D(0);
    const churchTaxAmount = taxDeductions.churchTax.enabled
      ? incomeTaxAmount.mul(pctToFrac(taxDeductions.churchTax.value))
      : D(0);
    const other = taxDeductions.otherDeductions;
    let otherDeductionsAnnual = D(0);
    if (other.enabled) {
      otherDeductionsAnnual =
        other.mode === 'currency'
          ? D(normalize(other.value)).mul(12)
          : annualBaseAmount.mul(pctToFrac(other.value));
    }
    return incomeTaxAmount.add(soliAmount).add(churchTaxAmount).add(otherDeductionsAnnual);
  }, [taxDeductions, annualBaseAmount]);

  const runningCostsTotalMonthly = React.useMemo(() => {
    let total = D(0);
    const item = runningCostsSplit.houseFee;
    if (item.enabled) {
      const val1 =
        item.mode === 'percent'
          ? baseAmount.mul(pctToFrac(item.value1))
          : D(normalize(item.value1));
      const val2 =
        item.mode === 'percent'
          ? baseAmount.mul(pctToFrac(item.value2))
          : D(normalize(item.value2));
      total = total.add(val1.sub(val2));
    }
    Object.values(otherRunningCosts).forEach((cost) => {
      if (cost.enabled) {
        const value =
          cost.mode === 'percent'
            ? baseAmount.mul(pctToFrac(cost.value))
            : D(normalize(cost.value));
        total = total.add(value);
      }
    });
    return total;
  }, [runningCostsSplit, otherRunningCosts, baseAmount]);

  React.useEffect(() => {
    const totalAnnual = runningCostsTotalMonthly.mul(12).add(deductionsTotalAnnual);
    onTotalChange(totalAnnual);
    onStateChange({ taxDeductions, runningCostsSplit, otherRunningCosts });
  }, [
    runningCostsTotalMonthly,
    deductionsTotalAnnual,
    onTotalChange,
    onStateChange,
    taxDeductions,
    runningCostsSplit,
    otherRunningCosts,
  ]);

  return (
    <>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 2 }}>
            <Typography fontWeight={700}>{t('realEstateForm.accordions.taxDeductions')}</Typography>
            <Typography color="text.secondary">
              {fmtMoney(deductionsTotalAnnual.div(12).toFixed(0))} {currency}
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
                baseAmount={annualBaseAmount}
                currency={currency}
              />
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 2 }}>
            <Typography fontWeight={700}>
              {t('realEstateForm.accordions.otherRunningCosts')}
            </Typography>
            <Typography color="text.secondary">
              {fmtMoney(runningCostsTotalMonthly.toFixed(0))} {currency}
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <SplitCostInputRow
              item={runningCostsSplit.houseFee}
              onItemChange={(v) => handleSplitCostChange('houseFee', v)}
              baseAmount={baseAmount}
              currency={currency}
            />
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
}
