// src/components/shared/credit/CreditForm.tsx

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Stack, TextField, Box, Divider, InputAdornment, Typography } from '@mui/material';
import { D, normalize, sanitizeDecimal } from '../investment/formHelpers';
import { ResultRow, CurrencySelect, PriceInput } from './../SharedComponents';
import { creditInterestMonthly, creditTotalMonthly, fmtMoney } from '../../../core/domain/calc';
import { useCreditStore } from '../../../core/state/useCreditStore';
import type { Credit } from '../../../core/domain/types';
import { useDefaults } from '../../../core/hooks/useDefaults';

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
    const { addCredit, updateCredit, credits } = useCreditStore();
    const existingCredit = React.useMemo(
      () => (editId ? credits.find((c) => c.id === editId) : undefined),
      [editId, credits],
    );

    // --- Cleanly get defaults using the custom hook ---
    const defaults = useDefaults();
    const creditDefaults = defaults.credit.basic;
    const { currency: mainCurrency } = defaults.meta;

    const [cName, setCName] = React.useState('');
    const [cPrincipal, setCPrincipal] = React.useState('');
    const [cRateAnnualPct, setCRateAnnualPct] = React.useState('');
    const [cRepaymentAnnualPct, setCRepaymentAnnualPct] = React.useState('');
    const [cTermMonths, setCTermMonths] = React.useState('');
    const [cFixedRateYears, setCFixedRateYears] = React.useState('');
    const [cSpecialRepayment, setCSpecialRepayment] = React.useState('');
    const [cCurrency, setCCurrency] = React.useState('');

    React.useEffect(() => {
      if (existingCredit) {
        const principalD = D(existingCredit.principal);
        setCName(existingCredit.name);
        setCPrincipal(principalD.toFixed(0));
        setCRateAnnualPct(existingCredit.rateAnnualPercent);
        setCTermMonths(String(existingCredit.termMonths || ''));
        setCFixedRateYears(String(existingCredit.fixedRateYears || ''));
        setCSpecialRepayment(D(existingCredit.specialRepaymentYearly || '0').toFixed(0));
        setCCurrency(existingCredit.currency);

        if (principalD.gt(0)) {
          const repaymentMonthlyD = D(existingCredit.repaymentMonthly);
          const repaymentAnnualD = repaymentMonthlyD.mul(12);
          const repaymentPct = repaymentAnnualD.div(principalD).mul(100).toDP(2).toString();
          setCRepaymentAnnualPct(repaymentPct);
        } else {
          setCRepaymentAnnualPct('0');
        }
      } else {
        // --- Set defaults for a new credit ---
        setCName('');
        setCPrincipal('200000');
        setCRateAnnualPct(String(creditDefaults.rateAnnualPct.value));
        setCRepaymentAnnualPct(String(creditDefaults.repaymentInitial.value * 100)); // Convert fraction to percent
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
    // --- NEW CALCULATION: From Annual % to Monthly Amount ---
    const repaymentPctD = D(normalize(cRepaymentAnnualPct));
    const repaymentMonthlyD = principalD.mul(repaymentPctD.div(100)).div(12);

    const draftCredit: Credit = React.useMemo(
      () => ({
        id: 'draft',
        name: cName,
        currency: cCurrency,
        principal: principalD.toFixed(2),
        rateAnnualPercent: rateD.toString(),
        repaymentMonthly: repaymentMonthlyD.toFixed(2), // Use the calculated monthly amount
        termMonths: parseInt(cTermMonths, 10) || 0,
        totalMonthly: '0',
        fixedRateYears: 0,
        specialRepaymentYearly: '0',
      }),
      [cName, cCurrency, principalD, rateD, repaymentMonthlyD, cTermMonths],
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

        const creditData: Omit<Credit, 'id'> = {
          name: trimmedName,
          currency: cCurrency,
          principal: principalD.toFixed(2),
          rateAnnualPercent: rateD.toString(),
          repaymentMonthly: repaymentMonthlyD.toFixed(2), // --- Save the calculated monthly amount ---
          totalMonthly: '0', // This will be recalculated anyway
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
            InputProps={{ endAdornment: <InputAdornment position="end">% p.a.</InputAdornment> }}
          />
          {/* --- UI UPDATED: For percentage input --- */}
          <TextField
            label={t('creditForm.labels.repaymentAnnualPct')}
            value={cRepaymentAnnualPct}
            onChange={(e) => setCRepaymentAnnualPct(sanitizeDecimal(e.target.value))}
            type="text"
            inputProps={{ inputMode: 'decimal' }}
            InputProps={{
              endAdornment: <InputAdornment position="end">% p.a.</InputAdornment>,
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
            label={t('creditForm.summary.repaymentMonthly')}
            value={`${fmtMoney(repaymentMonthlyD.toString())} ${cCurrency}`}
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
