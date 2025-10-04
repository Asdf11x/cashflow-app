import * as React from 'react';
import { Stack, TextField, Box, Divider, InputAdornment, Typography } from '@mui/material';
import { D, normalize, sanitizeDecimal } from '../investment/formHelpers';
import { ResultRow, CurrencySelect, PriceInput } from './../SharedComponents';
import { creditInterestMonthly, creditInterestYearly, fmtMoney } from '../../../core/domain/calc';
import { useCreditStore } from '../../../core/state/useCreditStore';
import type { Credit } from '../../../core/domain/types';

const CreditForm = React.forwardRef(({ onClose }: { onClose: () => void }, ref) => {
  const addCredit = useCreditStore((s) => s.addCreditRaw); // Assuming you have/add this action

  // Form State
  const [cName, setCName] = React.useState('Immobilienkredit');
  const [cPrincipal, setCPrincipal] = React.useState('200000');
  const [cEquity, setCEquity] = React.useState('50000');
  const [cRateAnnualPct, setCRateAnnualPct] = React.useState('3.5');
  const [cAmortMonthly, setCAmortMonthly] = React.useState('600');
  const [cCurrency, setCCurrency] = React.useState('€');

  // Touched State for Validation
  const [isNameTouched, setIsNameTouched] = React.useState(false);
  const [isPrincipalTouched, setIsPrincipalTouched] = React.useState(false);

  // Calculations using Decimal.js
  const principalD = D(normalize(cPrincipal));
  const equityD = D(normalize(cEquity));
  const rateD = D(normalize(cRateAnnualPct));
  const amortD = D(normalize(cAmortMonthly));

  const draftCredit: Credit = React.useMemo(
    () => ({
      id: 'draft',
      name: cName,
      principal: principalD.toFixed(2),
      equity: equityD.toFixed(2),
      rateAnnualPct: rateD.toString(),
      amortMonthly: amortD.toFixed(2),
      interestMonthly: '0',
      interestYearly: '0',
    }),
    [cName, principalD, equityD, rateD, amortD],
  );

  const interestMonthlyD = D(creditInterestMonthly(draftCredit));
  const interestYearlyD = D(creditInterestYearly(draftCredit));
  const totalPaymentMonthlyD = interestMonthlyD.add(amortD);
  const totalFinancingD = principalD.add(equityD);

  // Validation
  const trimmedName = cName.trim();
  const nameError = !trimmedName;
  const principalError = principalD.lte(0);

  // Expose submit function via ref
  React.useImperativeHandle(ref, () => ({
    submit: () => {
      setIsNameTouched(true);
      setIsPrincipalTouched(true);

      if (nameError || principalError) {
        return;
      }

      addCredit({
        id: `crd_${Date.now()}`,
        name: trimmedName,
        principal: principalD.toFixed(2),
        equity: equityD.toFixed(2),
        rateAnnualPct: rateD.toString(),
        amortMonthly: amortD.toFixed(2),
        // interestMonthly: interestMonthlyD.toFixed(2),
        // interestYearly: interestYearlyD.toFixed(2),
      });

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
        helperText={isNameTouched && nameError ? 'Name darf nicht leer sein' : ' '}
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
      <PriceInput
        label="Eingesetztes Eigenkapital"
        value={cEquity}
        onChange={(e) => setCEquity(sanitizeDecimal(e.target.value))}
        helperText=" "
        error={false}
      />
      <Divider />
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <TextField
          label="Sollzinssatz p.a."
          value={cRateAnnualPct}
          onChange={(e) => setCRateAnnualPct(sanitizeDecimal(e.target.value))}
          type="text"
          inputProps={{
            inputMode: 'decimal',
            pattern: '[0-9]*[.,]?[0-9]*',
          }}
          InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
        />
        <TextField
          label="Monatliche Tilgung"
          value={cAmortMonthly}
          onChange={(e) => setCAmortMonthly(sanitizeDecimal(e.target.value))}
          type="text"
          inputProps={{
            inputMode: 'decimal',
            pattern: '[0-9]*[.,]?[0-9]*',
          }}
          InputProps={{
            endAdornment: <InputAdornment position="end">{cCurrency}</InputAdornment>,
          }}
        />
      </Box>

      <Stack
        spacing={1}
        sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
      >
        <Typography variant="h6">Zusammenfassung</Typography>
        <ResultRow label="Gesamtfinanzierung" value={fmtMoney(totalFinancingD.toString())} isBold />
        <Divider sx={{ my: 1 }} />
        <ResultRow label="Monatliche Zinsen" value={fmtMoney(interestMonthlyD.toString())} />
        <ResultRow
          label="Monatliche Rate (Zins + Tilgung)"
          value={fmtMoney(totalPaymentMonthlyD.toString())}
          isBold
        />
        <ResultRow
          label="Jährliche Zinslast (1. Jahr)"
          value={fmtMoney(interestYearlyD.toString())}
        />
      </Stack>
    </Stack>
  );
});

export default CreditForm;
