import * as React from 'react';
import { Stack, TextField, Box, Divider, InputAdornment, Typography } from '@mui/material';
import { D, normalize, sanitizeDecimal } from './formHelpers';
import { ResultRow, CurrencySelect, PriceInput } from '../SharedComponents.tsx';
import { fmtMoney } from '../../../core/domain/calc';
import { useInvestStore } from '../../../core/state/useInvestStore.ts';
import { type ObjectInvestment } from '../../../core/domain/types.ts';

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
    const { addObject, updateObject, objects } = useInvestStore.getState();
    const existingObject = editId ? objects.find((o) => o.id === editId) : undefined;

    const [oName, setOName] = React.useState(existingObject?.name || 'Objekt');
    const [oLink, setOLink] = React.useState(existingObject?.link || '');
    const [oPurchasePrice, setOPurchasePrice] = React.useState(
      existingObject?.startAmount ? D(existingObject.startAmount).toFixed(0) : '10000',
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
    const trimmedLink = oLink.trim();
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

        const investmentData: ObjectInvestment = {
          id: editId || `obj_${Date.now()}`,
          name: trimmedName,
          link: trimmedLink,
          kind: 'OBJECT',
          startAmount: purchasePriceD.toFixed(2),
          netGainMonthly: monthlyGainD.toFixed(2),
          costMonthly: '0',
          currency: oCurrency,
          totalPrice: purchasePriceD.toFixed(2),
          netGainYearly: annualGainD.toFixed(2),
          returnPercent: yieldPct.toString(),
        };

        if (editId) {
          updateObject(investmentData);
        } else {
          addObject(investmentData);
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
        {/* --- NEW: Link input field --- */}
        <TextField
          label="Link (optional)"
          value={oLink}
          onChange={(e) => setOLink(e.target.value)}
          placeholder="https://beispiel.de/mein-objekt"
          fullWidth
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
          inputProps={{
            inputMode: 'decimal',
            pattern: '[0-9]*[.,]?[0-9]*',
          }}
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
          <ResultRow
            label="Jährlicher Gewinn"
            value={`${fmtMoney(annualGainD.toString())} ${oCurrency}`}
          />
          <ResultRow label="Anfangsrendite p.a." value={`${yieldPct} %`} isBold />
        </Stack>
      </Stack>
    );
  },
);

export default ObjectForm;
