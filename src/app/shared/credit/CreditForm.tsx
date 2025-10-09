// src/components/shared/credit/CreditForm.tsx

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Stack, TextField, Box, Divider, InputAdornment, Typography } from '@mui/material';
import { D, normalize, sanitizeDecimal } from '../investment/formHelpers';
import { ResultRow, CurrencySelect, PriceInput } from './../SharedComponents';
import { creditInterestMonthly, creditTotalMonthly, fmtMoney } from '../../../core/domain/calc';
import { useCreditStore } from '../../../core/state/useCreditStore';
import { useSettingsStore } from '../../../core/state/useSettingsStore';
import type { Credit } from '../../../core/domain/types';

// Import default value configurations for non-currency values
import deDefaultValues from '../../../config/defaults/de/default-values.json';
import czDefaultValues from '../../../config/defaults/cz/default-values.json';
import chDefaultValues from '../../../config/defaults/ch/default-values.json';

type DefaultsConfig = typeof deDefaultValues;

const allDefaults: Record<string, DefaultsConfig> = {
  de: deDefaultValues,
  cz: czDefaultValues,
  ch: chDefaultValues,
};

const CreditForm = React.forwardRef(
  (
    {
      onClose,
      editId,
      existingNames,
    }: { onClose: () => void; editId?: string; existingNames: string[] },
    ref,
  ) => {
    const { t } = useTranslation();
    // --- KORREKTUR: Verwenden Sie die reaktiven Hooks anstelle von .getState() ---
    // Dies stellt sicher, dass die Komponente neu gerendert wird, wenn die Daten geladen werden.
    const { addCredit, updateCredit, credits } = useCreditStore();
    const { countryProfile, mainCurrency } = useSettingsStore();

    // Finden Sie den zu bearbeitenden Kredit aus dem reaktiven 'credits'-Array.
    const existingCredit = React.useMemo(
      () => (editId ? credits.find((c) => c.id === editId) : undefined),
      [editId, credits],
    );

    const defaults = allDefaults[countryProfile] || deDefaultValues;
    const creditDefaults = defaults.credit.basic;

    // --- Form State ---
    const [cName, setCName] = React.useState('');
    const [cPrincipal, setCPrincipal] = React.useState('');
    const [cRateAnnualPct, setCRateAnnualPct] = React.useState('');
    const [cAmortMonthly, setCAmortMonthly] = React.useState('');
    const [cTermMonths, setCTermMonths] = React.useState('');
    const [cFixedRateYears, setCFixedRateYears] = React.useState('');
    const [cSpecialRepayment, setCSpecialRepayment] = React.useState('');
    const [cCurrency, setCCurrency] = React.useState('');

    // --- KORREKTUR: Verwenden Sie useEffect, um das Formular zu füllen, wenn `existingCredit` verfügbar wird ---
    React.useEffect(() => {
      if (existingCredit) {
        setCName(existingCredit.name);
        setCPrincipal(D(existingCredit.principal).toFixed(0));
        setCRateAnnualPct(existingCredit.rateAnnualPct);
        setCAmortMonthly(D(existingCredit.amortMonthly).toFixed(0));
        setCTermMonths(String(existingCredit.termMonths || ''));
        setCFixedRateYears(String(existingCredit.fixedRateYears || ''));
        setCSpecialRepayment(D(existingCredit.specialRepaymentYearly || '0').toFixed(0));
        setCCurrency(existingCredit.currency);
      } else {
        // Standardwerte für einen neuen Kredit setzen
        setCName('');
        setCPrincipal('200000');
        setCRateAnnualPct(String(creditDefaults.rateAnnualPct.value));
        const principal = D('200000');
        const yearlyAmortization = principal.mul(creditDefaults.amortizationInitial.value);
        setCAmortMonthly(yearlyAmortization.div(12).toFixed(0));
        setCTermMonths('120');
        setCFixedRateYears(String(creditDefaults.fixedRateYears.value));
        setCSpecialRepayment('0');
        setCCurrency(mainCurrency);
      }
    }, [existingCredit, mainCurrency, creditDefaults]);

    // Touched State for Validation
    const [isNameTouched, setIsNameTouched] = React.useState(false);
    const [isPrincipalTouched, setIsPrincipalTouched] = React.useState(false);

    // Calculations
    const principalD = D(normalize(cPrincipal));
    const rateD = D(normalize(cRateAnnualPct));
    const amortD = D(normalize(cAmortMonthly));

    const draftCredit: Credit = React.useMemo(
      () => ({
        id: 'draft',
        name: cName,
        currency: cCurrency,
        principal: principalD.toFixed(2),
        rateAnnualPct: rateD.toString(),
        amortMonthly: amortD.toFixed(2),
        termMonths: parseInt(cTermMonths, 10) || 0,
        totalMonthly: '0',
        fixedRateYears: 0,
        specialRepaymentYearly: '0',
      }),
      [cName, cCurrency, principalD, rateD, amortD, cTermMonths],
    );

    const interestMonthlyD = D(creditInterestMonthly(draftCredit));
    const totalPaymentMonthlyD = D(creditTotalMonthly(draftCredit));
    draftCredit.totalMonthly = totalPaymentMonthlyD.toFixed(2);

    // Validation
    const trimmedName = cName.trim();
    const nameError = !trimmedName || existingNames.includes(trimmedName);
    const principalError = principalD.lte(0);
    const nameHelperText = !trimmedName
      ? t('creditForm.helpers.nameEmpty')
      : existingNames.includes(trimmedName)
        ? t('creditForm.helpers.nameInUse')
        : '';

    React.useImperativeHandle(ref, () => ({
      submit: () => {
        setIsNameTouched(true);
        setIsPrincipalTouched(true);

        if (nameError || principalError) {
          return;
        }

        const creditData: Omit<Credit, 'id' | 'totalMonthly'> & { totalMonthly?: string } = {
          name: trimmedName,
          currency: cCurrency,
          principal: principalD.toFixed(2),
          rateAnnualPct: rateD.toString(),
          amortMonthly: amortD.toFixed(2),
          termMonths: parseInt(cTermMonths, 10) || 0,
          fixedRateYears: parseInt(cFixedRateYears, 10) || undefined,
          specialRepaymentYearly: D(normalize(cSpecialRepayment)).gt(0)
            ? D(normalize(cSpecialRepayment)).toFixed(2)
            : undefined,
        };

        creditData.totalMonthly = totalPaymentMonthlyD.toFixed(2);

        if (editId) {
          updateCredit({ id: editId, ...creditData });
        } else {
          addCredit(creditData);
        }

        onClose();
      },
      isValid: () => !nameError && !principalError,
    }));

    return (
      <Stack spacing={3} sx={{ mt: 1 }}>
        <TextField
          label={t('creditForm.labels.name')}
          value={cName}
          onChange={(e) => setCName(e.target.value)}
          onBlur={() => setIsNameTouched(true)}
          error={isNameTouched && nameError}
          helperText={isNameTouched && nameHelperText}
          fullWidth
          required
        />
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <PriceInput
            label={t('creditForm.labels.principal')}
            value={cPrincipal}
            onChange={(e) => setCPrincipal(sanitizeDecimal(e.target.value))}
            onBlur={() => setIsPrincipalTouched(true)}
            error={isPrincipalTouched && principalError}
            helperText={
              isPrincipalTouched && principalError ? t('creditForm.helpers.principalError') : ' '
            }
          />
          <CurrencySelect value={cCurrency} onChange={(e) => setCCurrency(e.target.value)} />
        </Box>
        <Divider />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField
            label={t('creditForm.labels.rateAnnualPct')}
            value={cRateAnnualPct}
            onChange={(e) => setCRateAnnualPct(sanitizeDecimal(e.target.value))}
            type="text"
            inputProps={{ inputMode: 'decimal' }}
            InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
          />
          <TextField
            label={t('creditForm.labels.amortizationMonthly')}
            value={cAmortMonthly}
            onChange={(e) => setCAmortMonthly(sanitizeDecimal(e.target.value))}
            type="text"
            inputProps={{ inputMode: 'decimal' }}
            InputProps={{
              endAdornment: <InputAdornment position="end">{cCurrency}</InputAdornment>,
            }}
          />
          <TextField
            label={t('creditForm.labels.termMonths')}
            value={cTermMonths}
            onChange={(e) => setCTermMonths(e.target.value.replace(/\D/g, ''))}
            type="number"
          />
          <TextField
            label={t('creditForm.labels.fixedRateYears')}
            value={cFixedRateYears}
            onChange={(e) => setCFixedRateYears(e.target.value.replace(/\D/g, ''))}
            type="number"
          />
        </Box>
        <PriceInput
          label={t('creditForm.labels.specialRepaymentYearly')}
          value={cSpecialRepayment}
          onChange={(e) => setCSpecialRepayment(sanitizeDecimal(e.target.value))}
          helperText=" "
          error={false}
        />

        <Stack
          spacing={1}
          sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
        >
          <Typography variant="h6">{t('creditForm.summary.title')}</Typography>
          <ResultRow
            label={t('creditForm.summary.interestMonthly')}
            value={`${fmtMoney(interestMonthlyD.toString())} ${cCurrency}`}
          />
          <ResultRow
            label={t('creditForm.summary.totalMonthly')}
            value={`${fmtMoney(totalPaymentMonthlyD.toString())} ${cCurrency}`}
            isBold
          />
        </Stack>
      </Stack>
    );
  },
);

export default CreditForm;
