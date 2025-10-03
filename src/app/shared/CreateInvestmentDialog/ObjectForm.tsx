import * as React from 'react';
import { Stack, TextField, Box, Divider, InputAdornment, Typography } from '@mui/material';
import { D, normalize, sanitizeDecimal } from './formHelpers';
import { ResultRow, CurrencySelect, PriceInput } from './SharedComponents';
import { fmtMoney } from '../../../core/domain/calc'; // Assuming path is correct

const ObjectForm = React.forwardRef(({ onClose }: { onClose: () => void }, ref) => {
  // ... rest of your component logic remains exactly the same
  const [oName, setOName] = React.useState('Objekt A');
  const [oPurchasePrice, setOPurchasePrice] = React.useState('10000');
  const [oCurrency, setOCurrency] = React.useState('€');
  const [oMonthlyGain, setOMonthlyGain] = React.useState('120');

  // Calculations
  const purchasePriceD = D(normalize(oPurchasePrice));
  const monthlyGainD = D(normalize(oMonthlyGain));
  const annualGainD = monthlyGainD.mul(12);
  const yieldPct = purchasePriceD.gt(0)
    ? annualGainD.div(purchasePriceD).mul(100).toDP(2).toString()
    : '0';
  const [isPriceTouched, setIsPriceTouched] = React.useState(false);

  const purchasePriceError = purchasePriceD.lte(0);

  // Expose submit function
  React.useImperativeHandle(ref, () => ({
    submit: () => {
      if (purchasePriceError) {
        setIsPriceTouched(true);
        return;
      }
      console.log('Creating Object:', {
        name: oName,
        purchasePrice: purchasePriceD.toString(),
        monthlyGain: monthlyGainD.toString(),
        currency: oCurrency,
      });
      onClose();
    },
  }));

  return (
    <Stack spacing={3} sx={{ mt: 1 }}>
      <TextField label="Name" value={oName} onChange={(e) => setOName(e.target.value)} fullWidth />
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
});

export default ObjectForm;
