// src/components/shared/investment/real-estate-form/PurchaseCostsSection.tsx

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
import { CostInputRow } from './CostInputs';
import { fmtMoney } from '../../../../core/domain/calc';

// --- Helper to calculate total costs ---
const calculateTotal = (
  costs: CostState,
  base: Decimal,
  specialHandlers: Record<string, 'subtract'> = {},
): Decimal => {
  return Object.entries(costs).reduce((sum, [key, item]) => {
    if (!item.enabled) return sum;
    const value =
      item.mode === 'percent' ? base.mul(pctToFrac(item.value)) : D(normalize(item.value));
    return specialHandlers[key] === 'subtract' ? sum.sub(value) : sum.add(value);
  }, new Decimal(0));
};

// --- Cost Section Accordion (Internal Component) ---
interface CostSectionAccordionProps {
  title: string;
  costs: CostState;
  onCostChange: (key: string, newValues: Partial<CostItemState>) => void;
  baseAmount: Decimal;
  currency: string;
  total: Decimal;
}

function CostSectionAccordion({
  title,
  costs,
  onCostChange,
  baseAmount,
  currency,
  total,
}: CostSectionAccordionProps) {
  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 2 }}>
          <Typography fontWeight={700}>{title}</Typography>
          <Typography color="text.secondary">
            {fmtMoney(total.toFixed(0))} {currency}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          {Object.entries(costs).map(([key, item]) => (
            <CostInputRow
              key={key}
              item={item}
              onItemChange={(newValues) => onCostChange(key, newValues)}
              baseAmount={baseAmount}
              currency={currency}
            />
          ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

// --- Main Purchase Costs Section Component ---
interface PurchaseCostsSectionProps {
  baseAmount: Decimal;
  currency: string;
  initialStates: { purchaseCosts: CostState; additionalCosts: CostState };
  onTotalChange: (total: Decimal) => void;
}

export type PurchaseCostsSectionHandle = {
  getData: () => {
    purchaseCosts: CostState;
    additionalCosts: CostState;
  };
};

const PurchaseCostsSection = React.forwardRef<
  PurchaseCostsSectionHandle,
  PurchaseCostsSectionProps
>(({ baseAmount, currency, initialStates, onTotalChange }, ref) => {
  const { t } = useTranslation();
  const [purchaseCosts, setPurchaseCosts] = React.useState<CostState>(initialStates.purchaseCosts);
  const [additionalCosts, setAdditionalCosts] = React.useState<CostState>(
    initialStates.additionalCosts,
  );

  const handleCostChange =
    (setState: React.Dispatch<React.SetStateAction<CostState>>) =>
    (key: string, newValues: Partial<CostItemState>) => {
      setState((prev) => ({ ...prev, [key]: { ...prev[key], ...newValues } }));
    };

  const purchaseCostsTotal = React.useMemo(
    () => calculateTotal(purchaseCosts, baseAmount),
    [purchaseCosts, baseAmount],
  );
  const additionalCostsTotal = React.useMemo(
    () => calculateTotal(additionalCosts, baseAmount, { subvention: 'subtract' }),
    [additionalCosts, baseAmount],
  );

  React.useEffect(() => {
    onTotalChange(purchaseCostsTotal.add(additionalCostsTotal));
  }, [purchaseCostsTotal, additionalCostsTotal, onTotalChange]);

  // Expose a function for the parent to get the final state
  React.useImperativeHandle(ref, () => ({
    getData: () => ({
      purchaseCosts,
      additionalCosts,
    }),
  }));

  return (
    <>
      <CostSectionAccordion
        title={t('realEstateForm.accordions.purchaseCosts')}
        costs={purchaseCosts}
        onCostChange={handleCostChange(setPurchaseCosts)}
        baseAmount={baseAmount}
        currency={currency}
        total={purchaseCostsTotal}
      />
      <CostSectionAccordion
        title={t('realEstateForm.accordions.additionalPurchaseCosts')}
        costs={additionalCosts}
        onCostChange={handleCostChange(setAdditionalCosts)}
        baseAmount={baseAmount}
        currency={currency}
        total={additionalCostsTotal}
      />
    </>
  );
});

export default PurchaseCostsSection;
