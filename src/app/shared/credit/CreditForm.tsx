import * as React from 'react';
import { Stack, TextField, Box, Divider, InputAdornment, Typography } from '@mui/material';
import { D, normalize, sanitizeDecimal } from '../investment/formHelpers';
import { ResultRow, CurrencySelect, PriceInput } from './../SharedComponents';
import { creditInterestMonthly, creditTotalMonthly, fmtMoney } from '../../../core/domain/calc';
import { useCreditStore } from '../../../core/state/useCreditStore';
import { useSettingsStore } from '../../../core/state/useSettingsStore';
import type { Credit } from '../../../core/domain/types';

// Import default value configurations
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
    const { addCredit, updateCredit, credits } = useCreditStore.getState();
    const existingCredit = editId ? credits.find((c) => c.id === editId) : undefined;

    // --- State Sourcing from Global Settings ---
    const { countryProfile } = useSettingsStore.getState();
    const defaults = allDefaults[countryProfile] || deDefaultValues;
    const creditDefaults = defaults.investments.credit.basic;

    // --- Form State ---
    // Use default values from config as fallback if not editing
    const [cName, setCName] = React.useState(existingCredit?.name || 'Immobilienkredit');
    const [cPrincipal, setCPrincipal] = React.useState(
      existingCredit ? D(existingCredit.principal).toFixed(0) : '200000',
    );
    const [cRateAnnualPct, setCRateAnnualPct] = React.useState(
      existingCredit?.rateAnnualPct || String(creditDefaults.rateAnnualPct.value),
    );
    // Calculate initial amortization based on principal and default percentage
    const [cAmortMonthly, setCAmortMonthly] = React.useState(() => {
      if (existingCredit) {
        return D(existingCredit.amortMonthly).toFixed(0);
      }
      const principal = D('200000');
      const yearlyAmortization = principal.mul(creditDefaults.amortizationInitial.value);
      return yearlyAmortization.div(12).toFixed(0);
    });
    const [cTermMonths, setCTermMonths] = React.useState(
      existingCredit?.termMonths ? String(existingCredit.termMonths) : '120', // Default to 120 months (10 years)
    );
    const [cFixedRateYears, setCFixedRateYears] = React.useState(
      existingCredit?.fixedRateYears
        ? String(existingCredit.fixedRateYears)
        : String(creditDefaults.fixedRateYears.value),
    );
    const [cSpecialRepayment, setCSpecialRepayment] = React.useState(
      existingCredit?.specialRepaymentYearly
        ? D(existingCredit.specialRepaymentYearly).toFixed(0)
        : '0',
    );
    const [cCurrency, setCCurrency] = React.useState(
      existingCredit?.currency || defaults.meta.currency,
    );

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
      }),
      [cName, cCurrency, principalD, rateD, amortD, cTermMonths],
    );

    const interestMonthlyD = D(creditInterestMonthly(draftCredit));
    const totalPaymentMonthlyD = D(creditTotalMonthly(draftCredit));

    // Validation
    const trimmedName = cName.trim();
    const nameError = !trimmedName || existingNames.includes(trimmedName);
    const principalError = principalD.lte(0);
    const nameHelperText = !trimmedName
      ? 'Name darf nicht leer sein'
      : existingNames.includes(trimmedName)
        ? 'Name bereits vergeben'
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
          rateAnnualPct: rateD.toString(),
          amortMonthly: amortD.toFixed(2),
          termMonths: parseInt(cTermMonths, 10) || 0,
          fixedRateYears: parseInt(cFixedRateYears, 10) || undefined,
          specialRepaymentYearly: D(normalize(cSpecialRepayment)).gt(0)
            ? D(normalize(cSpecialRepayment)).toFixed(2)
            : undefined,
        };

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
          label="Name des Kredits"
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
            label="Kreditsumme (Darlehen)"
            value={cPrincipal}
            onChange={(e) => setCPrincipal(sanitizeDecimal(e.target.value))}
            onBlur={() => setIsPrincipalTouched(true)}
            error={isPrincipalTouched && principalError}
            helperText={isPrincipalTouched && principalError ? 'Kreditsumme muss > 0 sein' : ' '}
          />
          <CurrencySelect value={cCurrency} onChange={(e) => setCCurrency(e.target.value)} />
        </Box>
        <Divider />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField
            label="Sollzinssatz p.a."
            value={cRateAnnualPct}
            onChange={(e) => setCRateAnnualPct(sanitizeDecimal(e.target.value))}
            type="text"
            inputProps={{ inputMode: 'decimal' }}
            InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
          />
          <TextField
            label="Monatliche Tilgung"
            value={cAmortMonthly}
            onChange={(e) => setCAmortMonthly(sanitizeDecimal(e.target.value))}
            type="text"
            inputProps={{ inputMode: 'decimal' }}
            InputProps={{
              endAdornment: <InputAdornment position="end">{cCurrency}</InputAdornment>,
            }}
          />
          <TextField
            label="Gesamtlaufzeit (Monate)"
            value={cTermMonths}
            onChange={(e) => setCTermMonths(e.target.value)}
            type="number"
          />
          <TextField
            label="Zinsbindung (Jahre)"
            value={cFixedRateYears}
            onChange={(e) => setCFixedRateYears(e.target.value)}
            type="number"
          />
        </Box>
        <PriceInput
          label="Sondertilgung (jährlich)"
          value={cSpecialRepayment}
          onChange={(e) => setCSpecialRepayment(sanitizeDecimal(e.target.value))}
          helperText=" "
          error={false}
        />

        <Stack
          spacing={1}
          sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
        >
          <Typography variant="h6">Zusammenfassung</Typography>
          <ResultRow
            label="Monatliche Zinsen (1. Monat)"
            value={`${fmtMoney(interestMonthlyD.toString())} ${cCurrency}`}
          />
          <ResultRow
            label="Monatliche Rate (Zins + Tilgung)"
            value={`${fmtMoney(totalPaymentMonthlyD.toString())} ${cCurrency}`}
            isBold
          />
        </Stack>
      </Stack>
    );
  },
);

export default CreditForm;
