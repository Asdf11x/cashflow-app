// src/components/DepositForm.tsx

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Stack,
  TextField,
  Box,
  Divider,
  InputAdornment,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { D, normalize, sanitizeDecimal, pctToFrac, type CostState } from './formHelpers';
import { ResultRow, CurrencySelect, PriceInput } from '../SharedComponents.tsx';
import { fmtMoney } from '../../../core/domain/calc';
import { useInvestStore } from '../../../core/state/useInvestStore.ts';
import { type Depositvestment } from '../../../core/domain/types.ts';
import Decimal from 'decimal.js';
import { CostInputRow } from './real-estate-form/CostInputs.tsx';
import { useDefaults } from '../../../core/hooks/useDefaults.ts';
import { TaxDeductionsAccordion } from './TaxDeductionsAccordion.tsx';

const DepositForm = React.forwardRef(
  (
    {
      onClose,
      existingNames,
      editId,
    }: {
      onClose: () => void;
      existingNames: string[];
      editId?: string;
    },
    ref,
  ) => {
    const { t } = useTranslation();
    const defaults = useDefaults();

    const depositDefaults = defaults.investments.fixedTermDeposit.basic;
    const { currency: metaCurrency } = defaults.meta;
    const taxDefaults = defaults.investments.fixedTermDeposit.taxes;

    const { addDeposit, updateDeposit, deposits } = useInvestStore.getState();
    const existingDeposit = editId ? deposits.find((d) => d.id === editId) : undefined;

    const [dName, setDName] = React.useState(existingDeposit?.name || t('depositForm.defaultName'));
    const [dLink, setDLink] = React.useState(existingDeposit?.link || '');
    const [dStartAmount, setDStartAmount] = React.useState(
      existingDeposit?.startAmount
        ? D(existingDeposit.startAmount).toFixed(0)
        : String(depositDefaults.startAmount.value),
    );
    const [dCurrency, setDCurrency] = React.useState(existingDeposit?.currency || metaCurrency);
    const [dTermMonths, setDTermMonths] = React.useState(
      existingDeposit?.termMonths
        ? String(existingDeposit.termMonths)
        : String(depositDefaults.termMonths.value),
    );
    const [dRateNominal, setDRateNominal] = React.useState(
      existingDeposit?.rateNominal
        ? String(existingDeposit.rateNominal)
        : String(depositDefaults.rateNominal.value),
    );
    const [dCompounding, setDCompounding] = React.useState<Depositvestment['compounding']>(
      existingDeposit?.compounding ||
        (depositDefaults.compounding.value as Depositvestment['compounding']),
    );
    const [isNameTouched, setIsNameTouched] = React.useState(false);
    const [isPriceTouched, setIsPriceTouched] = React.useState(false);

    const [taxDeductions, setTaxDeductions] = React.useState<CostState>({
      withholdingTax: {
        enabled: true,
        value: String(taxDefaults.withholdingTaxRate),
        mode: 'percent',
        allowModeChange: false,
        label: t('depositForm.optionalAccordion.withholdingTax'),
      },
      solidaritySurcharge: {
        enabled: true,
        value: '5.5',
        mode: 'percent',
        allowModeChange: false,
        label: t('depositForm.optionalAccordion.solidaritySurcharge'),
      },
      churchTax: {
        enabled: false,
        value: '8',
        mode: 'percent',
        allowModeChange: true,
        label: t('depositForm.optionalAccordion.churchTax'),
      },
    });

    const [dTaxFreeAllowance, setDTaxFreeAllowance] = React.useState(
      existingDeposit?.taxFreeAllowance
        ? D(existingDeposit.taxFreeAllowance).toFixed(0)
        : String(taxDefaults.taxFreeAllowance),
    );

    const [accountFees, setAccountFees] = React.useState<CostState>({
      yearly: {
        enabled: false,
        value: '0',
        mode: 'currency',
        allowModeChange: true,
        // IMPORTANT: keep this as a translated label, don't re-translate later
        label: t('depositForm.fees.accountYearly'),
      },
    });

    const [totalAnnualTaxD, setTotalAnnualTaxD] = React.useState(D(0));

    // Calculations (memoize primitives where possible)
    const startAmountD = React.useMemo(() => D(normalize(dStartAmount)), [dStartAmount]);
    const termMonthsN = React.useMemo(() => parseInt(dTermMonths, 10) || 0, [dTermMonths]);
    const termYearsD = React.useMemo(
      () => (termMonthsN > 0 ? D(termMonthsN).div(12) : D(0)),
      [termMonthsN],
    );
    const rateNominalPctD = React.useMemo(() => D(normalize(dRateNominal)), [dRateNominal]);
    const rateNominalFracD = React.useMemo(() => rateNominalPctD.div(100), [rateNominalPctD]);

    const grossGainD = React.useMemo(() => {
      if (startAmountD.lte(0) || rateNominalFracD.lte(0) || termYearsD.lte(0)) return D(0);
      if (dCompounding === 'NONE') {
        return startAmountD.mul(rateNominalFracD).mul(termYearsD);
      }
      if (dCompounding === 'MONTHLY') {
        const n = 12;
        const nt = D(n).mul(termYearsD);
        const totalAmount = startAmountD.mul(D(1).add(rateNominalFracD.div(n)).pow(nt));
        return totalAmount.sub(startAmountD);
      }
      if (dCompounding === 'YEARLY') {
        const fullYears = Math.floor(termMonthsN / 12);
        const remainingMonths = termMonthsN % 12;
        let principal = startAmountD;
        if (fullYears > 0) {
          principal = principal.mul(D(1).add(rateNominalFracD).pow(fullYears));
        }
        if (remainingMonths > 0) {
          const remainingYears = D(remainingMonths).div(12);
          const simpleInterest = principal.mul(rateNominalFracD).mul(remainingYears);
          principal = principal.add(simpleInterest);
        }
        return principal.sub(startAmountD);
      }
      return D(0);
    }, [startAmountD, rateNominalFracD, termYearsD, termMonthsN, dCompounding]);

    const grossGainYearlyD = React.useMemo(
      () => (termYearsD.gt(0) ? grossGainD.div(termYearsD) : D(0)),
      [grossGainD, termYearsD],
    );

    const calculateTotalCosts = React.useCallback(
      (costs: CostState, base: Decimal): Decimal =>
        Object.values(costs).reduce((sum, item) => {
          if (!item.enabled) return sum;
          const value =
            item.mode === 'percent' ? base.mul(pctToFrac(item.value)) : D(normalize(item.value));
          return sum.add(value);
        }, D(0)),
      [],
    );

    const totalFeesD = React.useMemo(() => {
      const yearlyFees = calculateTotalCosts(accountFees, startAmountD);
      return yearlyFees.mul(termYearsD); // Total fees over the term
    }, [accountFees, startAmountD, termYearsD, calculateTotalCosts]);

    // --- Compute net values ---
    const totalTaxOverTermD = React.useMemo(
      () => totalAnnualTaxD.mul(termYearsD),
      [totalAnnualTaxD, termYearsD],
    );
    const totalNetGainD = React.useMemo(
      () => grossGainD.sub(totalTaxOverTermD).sub(totalFeesD),
      [grossGainD, totalTaxOverTermD, totalFeesD],
    );
    const netGainYearlyD = React.useMemo(
      () => (termYearsD.gt(0) ? totalNetGainD.div(termYearsD) : D(0)),
      [totalNetGainD, termYearsD],
    );
    const netGainMonthlyD = React.useMemo(() => netGainYearlyD.div(12), [netGainYearlyD]);
    const yieldPct = React.useMemo(
      () =>
        startAmountD.gt(0) ? netGainYearlyD.div(startAmountD).mul(100).toDP(2).toString() : '0',
      [netGainYearlyD, startAmountD],
    );

    // Validation
    const trimmedName = dName.trim();
    const startAmountError = startAmountD.lte(0);
    const nameError = !trimmedName || existingNames.includes(trimmedName);
    const nameHelperText = !trimmedName
      ? t('depositForm.nameHelperEmpty')
      : existingNames.includes(trimmedName)
        ? t('depositForm.nameHelperInUse')
        : '';

    const handleTaxDeductionsChange = (key: string, newValues: Partial<CostState[string]>) => {
      setTaxDeductions((prev) => ({ ...prev, [key]: { ...prev[key], ...newValues } }));
    };

    const handleAccountFeesChange = React.useCallback(
      (key: string, v: Partial<CostState[string]>) => {
        setAccountFees((p) => ({ ...p, [key]: { ...p[key], ...v } }));
      },
      [],
    );

    // IMPORTANT: Do NOT re-translate already translated labels — that caused i18next missingKey logs
    const memoizedAccountFees = React.useMemo(() => {
      return Object.entries(accountFees).map(([key, item]) => ({
        key,
        item: { ...item },
      }));
    }, [accountFees]);

    // Guarded setter to prevent parent-child update loops when child re-emits same value
    const handleTotalAnnualTaxChange = React.useCallback((v: Decimal | number | string) => {
      const next = D(typeof v === 'object' && v !== null ? (v as Decimal).toString() : String(v));
      setTotalAnnualTaxD((prev) => (prev.eq(next) ? prev : next));
    }, []);

    React.useImperativeHandle(ref, () => ({
      submit: () => {
        setIsPriceTouched(true);
        setIsNameTouched(true);
        if (startAmountError || nameError) return;
        const investmentData: Depositvestment = {
          id: editId || `dep_${Date.now()}`,
          name: trimmedName,
          link: dLink.trim(),
          kind: 'FIXED_TERM_DEPOSIT',
          currency: dCurrency,
          startAmount: startAmountD.toFixed(2),
          totalPrice: startAmountD.toFixed(2),
          termMonths: termMonthsN,
          rateNominal: rateNominalPctD.toNumber(),
          compounding: dCompounding,
          withholdingTaxRate: taxDeductions.withholdingTax.enabled
            ? D(taxDeductions.withholdingTax.value).toNumber()
            : undefined,
          taxFreeAllowance: D(normalize(dTaxFreeAllowance)).toFixed(2),
          feesAccount: totalFeesD.toFixed(2),
          netGainMonthly: netGainMonthlyD.toFixed(2),
          netGainYearly: netGainYearlyD.toFixed(2),
          returnPercent: yieldPct,
        };
        if (editId) {
          updateDeposit(investmentData);
        } else {
          addDeposit(investmentData);
        }
        onClose();
      },
      isValid: () => !startAmountError && !nameError,
    }));

    return (
      <Stack spacing={3} sx={{ mt: 1 }}>
        {/* Name */}
        <TextField
          label={t('depositForm.nameLabel')}
          value={dName}
          onChange={(e) => setDName(e.target.value)}
          onBlur={() => setIsNameTouched(true)}
          error={isNameTouched && nameError}
          helperText={isNameTouched && nameHelperText}
          fullWidth
          required
        />
        {/* Link */}
        <TextField
          label={t('depositForm.linkLabel')}
          value={dLink}
          onChange={(e) => setDLink(e.target.value)}
          placeholder={t('depositForm.linkPlaceholder')}
          fullWidth
        />
        {/* Amount + Currency */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <PriceInput
            label={t('depositForm.startAmountLabel')}
            value={dStartAmount}
            onChange={(e) => setDStartAmount(sanitizeDecimal(e.target.value))}
            onBlur={() => setIsPriceTouched(true)}
            error={isPriceTouched && startAmountError}
            helperText={
              isPriceTouched && startAmountError ? t('depositForm.startAmountHelper') : ' '
            }
          />
          <CurrencySelect value={dCurrency} onChange={(e) => setDCurrency(e.target.value)} />
        </Box>
        {/* Term + Rate */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label={t('depositForm.termLabel')}
            type="number"
            value={dTermMonths}
            onChange={(e) => setDTermMonths(e.target.value)}
            fullWidth
          />
          <TextField
            label={t('depositForm.rateLabel')}
            type="text"
            inputProps={{ inputMode: 'decimal' }}
            value={dRateNominal}
            onChange={(e) => setDRateNominal(sanitizeDecimal(e.target.value))}
            fullWidth
            InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
          />
        </Box>
        {/* Compounding */}
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t('depositForm.compoundingTitle')}
          </Typography>
          <ToggleButtonGroup
            value={dCompounding}
            exclusive
            fullWidth
            onChange={(_, v) => v && setDCompounding(v)}
          >
            <ToggleButton value="NONE">{t('depositForm.compounding.none')}</ToggleButton>
            <ToggleButton value="MONTHLY">{t('depositForm.compounding.monthly')}</ToggleButton>
            <ToggleButton value="YEARLY">{t('depositForm.compounding.yearly')}</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Taxes */}
        <TaxDeductionsAccordion
          taxDeductions={taxDeductions}
          onTaxDeductionsChange={handleTaxDeductionsChange}
          taxFreeAllowance={dTaxFreeAllowance}
          onTaxFreeAllowanceChange={setDTaxFreeAllowance}
          // Pass a primitive to avoid child effects retriggering on Decimal identity changes
          grossAnnualGain={grossGainYearlyD.toDecimalPlaces()}
          currency={dCurrency}
          onTotalAnnualTaxChange={handleTotalAnnualTaxChange}
        />

        {/* Fees */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={700}>{t('depositForm.fees.title')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              {memoizedAccountFees.map(({ key, item }) => (
                <CostInputRow
                  key={key}
                  item={item}
                  onItemChange={(v) => handleAccountFeesChange(key, v)}
                  baseAmount={startAmountD}
                  currency={dCurrency}
                />
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Divider />
        {/* Summary */}
        <Stack
          spacing={1}
          sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
        >
          <Typography variant="h6">{t('depositForm.summary.title')}</Typography>
          <ResultRow
            label={t('depositForm.summary.grossGainLabel')}
            value={`${fmtMoney(grossGainD.toString())} ${dCurrency}`}
          />
          <ResultRow
            label={t('depositForm.summary.deductionsLabel')}
            value={`-${fmtMoney(totalTaxOverTermD.add(totalFeesD).toString())} ${dCurrency}`}
          />
          <ResultRow
            label={t('depositForm.summary.totalNetGainLabel')}
            value={`${fmtMoney(totalNetGainD.toString())} ${dCurrency}`}
            isBold
          />
          <ResultRow
            label={t('depositForm.summary.annualNetGainLabel')}
            value={`${fmtMoney(netGainYearlyD.toString())} ${dCurrency}`}
          />
          <ResultRow
            label={t('depositForm.summary.monthlyNetGainLabel')}
            value={`${fmtMoney(netGainMonthlyD.toString())} ${dCurrency}`}
          />
          <ResultRow
            label={t('depositForm.summary.netYieldLabel')}
            value={`${yieldPct} %`}
            isBold
          />
        </Stack>
      </Stack>
    );
  },
);

export default DepositForm;
