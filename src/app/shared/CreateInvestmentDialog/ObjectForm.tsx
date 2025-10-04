import * as React from 'react';
import { Stack, TextField, Box, Divider, InputAdornment, Typography } from '@mui/material';
import { D, normalize, sanitizeDecimal } from './formHelpers';
import { ResultRow, CurrencySelect, PriceInput } from './SharedComponents';
import { fmtMoney } from '../../../core/domain/calc';
import { useInvestStore } from '../../../core/state/useInvestStore.ts'; // Assuming path is correct

const ObjectForm = React.forwardRef(
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
    const existingObject = useInvestStore((s) =>
      editId ? s.objects.find((o) => o.id === editId) : undefined,
    );

    const [oName, setOName] = React.useState(existingObject?.name || 'Objekt');
    const [oPurchasePrice, setOPurchasePrice] = React.useState(
      existingObject?.purchasePrice ? D(existingObject.purchasePrice).toFixed(0) : '10000',
    );
    const [oCurrency, setOCurrency] = React.useState(existingObject?.currency || '€');
    const [oMonthlyGain, setOMonthlyGain] = React.useState(
      existingObject?.netGainMonthly ? D(existingObject.netGainMonthly).toFixed(0) : '120',
    );
    const [isPriceTouched, setIsPriceTouched] = React.useState(false);
    const [isNameTouched, setIsNameTouched] = React.useState(false);

    // Calculations
    const purchasePriceD = D(normalize(oPurchasePrice));
    const monthlyGainD = D(normalize(oMonthlyGain));
    const annualGainD = monthlyGainD.mul(12);
    const yieldPct = purchasePriceD.gt(0)
      ? annualGainD.div(purchasePriceD).mul(100).toDP(2).toString()
      : '0';

    // Validation
    const trimmedName = oName.trim();
    const purchasePriceError = purchasePriceD.lte(0);
    const nameError = !trimmedName || existingNames.includes(trimmedName);
    const nameHelperText = !trimmedName
      ? 'Name darf nicht leer sein'
      : existingNames.includes(trimmedName)
        ? 'Name bereits vergeben'
        : ' ';

    // Expose submit function
    React.useImperativeHandle(ref, () => ({
      submit: () => {
        setIsPriceTouched(true);
        setIsNameTouched(true);

        if (purchasePriceError || nameError) {
          return;
        }

        if (editId) {
          useInvestStore.setState((s) => ({
            objects: s.objects.map((o) =>
              o.id === editId
                ? {
                    ...o,
                    name: trimmedName,
                    kind: 'OBJECT',
                    purchasePrice: purchasePriceD.toFixed(2),
                    // monthlyGain: monthlyGainD.toFixed(2),
                    netGainMonthly: monthlyGainD.toFixed(2),
                    currency: oCurrency,
                    totalPrice: purchasePriceD.toFixed(2),
                    netGainYearly: annualGainD.toFixed(2),
                    returnPercent: yieldPct.toString(),
                  }
                : o,
            ),
          }));
        } else {
          // Create new
          useInvestStore.getState().addObjectRaw({
            id: `obj_${Date.now()}`,
            name: trimmedName,
            kind: 'OBJECT',
            purchasePrice: purchasePriceD.toFixed(2),
            netGainMonthly: monthlyGainD.toFixed(2),
            currency: oCurrency,
            totalPrice: purchasePriceD.toFixed(2),
            netGainYearly: annualGainD.toFixed(2),
            returnPercent: yieldPct.toString(),
          });
        }

        onClose();
      },
      isValid: () => !purchasePriceError && !nameError,
    }));

    return (
      <Stack spacing={3} sx={{ mt: 1 }}>
        <TextField
          label="Name"
          value={oName}
          onChange={(e) => setOName(e.target.value)}
          onBlur={() => setIsNameTouched(true)}
          error={isNameTouched && nameError}
          helperText={isNameTouched ? nameHelperText : ' '}
          fullWidth
          required
        />
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <PriceInput
            label="Kaufpreis"
            value={oPurchasePrice}
            onChange={(e) => setOPurchasePrice(sanitizeDecimal(e.target.value))}
            onBlur={() => setIsPriceTouched(true)}
            error={isPriceTouched && purchasePriceError}
            helperText={isPriceTouched && purchasePriceError ? 'Kaufpreis muss > 0 sein' : ' '}
          />
          <CurrencySelect value={oCurrency} onChange={(e) => setOCurrency(e.target.value)} />
        </Box>
        <TextField
          label="Monatlicher Gewinn"
          type="text"
          inputMode="decimal"
          value={oMonthlyGain}
          onChange={(e) => setOMonthlyGain(sanitizeDecimal(e.target.value))}
          fullWidth
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Typography>{oCurrency}</Typography>
              </InputAdornment>
            ),
          }}
        />
        <Divider />
        <Stack
          spacing={1}
          sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
        >
          <Typography variant="h6">Zusammenfassung</Typography>
          <ResultRow label="Jährlicher Gewinn" value={fmtMoney(annualGainD.toString())} />
          <ResultRow label="Anfangsrendite p.a." value={`${yieldPct} %`} isBold />
        </Stack>
      </Stack>
    );
  },
);

export default ObjectForm;
