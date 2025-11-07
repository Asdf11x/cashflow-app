import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Stack,
  TextField,
  InputAdornment,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Decimal from 'decimal.js';
import type { CostItemState, CostState } from './formHelpers';
import { D, normalize, pctToFrac, sanitizeDecimal } from './formHelpers';
import { fmtMoney } from '../../../core/domain/calc';
import { CostInputRow } from './real-estate-form/CostInputs.tsx';

interface TaxDeductionsAccordionProps {
  taxDeductions: CostState;
  onTaxDeductionsChange: (key: string, newValues: Partial<CostItemState>) => void;
  taxFreeAllowance: string;
  onTaxFreeAllowanceChange: (value: string) => void;
  grossAnnualGain: Decimal;
  currency: string;
  onTotalAnnualTaxChange: (total: Decimal) => void;
}

export const TaxDeductionsAccordion = ({
  taxDeductions,
  onTaxDeductionsChange,
  taxFreeAllowance,
  onTaxFreeAllowanceChange,
  grossAnnualGain,
  currency,
  onTotalAnnualTaxChange,
}: TaxDeductionsAccordionProps) => {
  const { t } = useTranslation();

  const totalAnnualTax = React.useMemo(() => {
    const taxFreeAllowanceD = D(normalize(taxFreeAllowance));
    const taxableGain = Decimal.max(grossAnnualGain.sub(taxFreeAllowanceD), 0);

    if (taxableGain.lte(0)) return D(0);

    // 1. Calculate Withholding Tax (based on taxable gain)
    const withholdingTaxConfig = taxDeductions.withholdingTax;
    const withholdingTaxAmount = withholdingTaxConfig.enabled
      ? taxableGain.mul(pctToFrac(withholdingTaxConfig.value))
      : D(0);

    // 2. Solidarity Surcharge and Church Tax are based on the Withholding Tax amount
    const solidaritySurchargeConfig = taxDeductions.solidaritySurcharge;
    const solidaritySurchargeAmount = solidaritySurchargeConfig.enabled
      ? withholdingTaxAmount.mul(pctToFrac(solidaritySurchargeConfig.value))
      : D(0);

    const churchTaxConfig = taxDeductions.churchTax;
    const churchTaxAmount = churchTaxConfig.enabled
      ? withholdingTaxAmount.mul(pctToFrac(churchTaxConfig.value))
      : D(0);

    return withholdingTaxAmount.add(solidaritySurchargeAmount).add(churchTaxAmount);
  }, [taxDeductions, grossAnnualGain, taxFreeAllowance]);

  React.useEffect(() => {
    onTotalAnnualTaxChange(totalAnnualTax);
  }, [totalAnnualTax, onTotalAnnualTaxChange]);

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 2 }}>
          <Typography fontWeight={700}>{t('depositForm.optionalAccordion.title')}</Typography>
          <Typography color="text.secondary">
            - {fmtMoney(totalAnnualTax.div(12).toFixed(0))} {currency}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          <TextField
            label={t('depositForm.optionalAccordion.taxFreeAllowanceLabel')}
            value={taxFreeAllowance}
            onChange={(e) => onTaxFreeAllowanceChange(sanitizeDecimal(e.target.value))}
            InputProps={{
              endAdornment: <InputAdornment position="end">{currency}</InputAdornment>,
            }}
          />
          <Divider />
          {Object.entries(taxDeductions).map(([key, item]) => (
            <CostInputRow
              key={key}
              item={item}
              onItemChange={(v) => onTaxDeductionsChange(key, v)}
              baseAmount={grossAnnualGain} // Base is for display, logic is handled above
              currency={currency}
            />
          ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};
