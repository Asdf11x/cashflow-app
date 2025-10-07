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

    // Initialize values based on existing object or defaults
    // If editing, reconstruct Revenue from Net + Cost.
    const initCost = existingObject?.costMonthly ? D(existingObject.costMonthly) : D(0);
    const initNet = existingObject?.netGainMonthly ? D(existingObject.netGainMonthly) : D(120);
    const initRevenue = existingObject ? initNet.add(initCost) : D(120);

    const [oName, setOName] = React.useState(existingObject?.name || 'Objekt');
    const [oLink, setOLink] = React.useState(existingObject?.link || '');
    const [oPurchasePrice, setOPurchasePrice] = React.useState(
      existingObject?.startAmount ? D(existingObject.startAmount).toFixed(0) : '10000',
    );
    const [oCurrency, setOCurrency] = React.useState(existingObject?.currency || '€');

    // States for Revenue and Cost
    const [oMonthlyRevenue, setOMonthlyRevenue] = React.useState(initRevenue.toFixed(0));
    const [oMonthlyCost, setOMonthlyCost] = React.useState(initCost.toFixed(0));

    const [isPriceTouched, setIsPriceTouched] = React.useState(false);
    const [isNameTouched, setIsNameTouched] = React.useState(false);

    // Calculations
    const purchasePriceD = D(normalize(oPurchasePrice));
    const monthlyRevenueD = D(normalize(oMonthlyRevenue));
    const monthlyCostD = D(normalize(oMonthlyCost));

    // Net = Revenue - Cost
    const monthlyNetGainD = monthlyRevenueD.sub(monthlyCostD);
    const annualNetGainD = monthlyNetGainD.mul(12);

    const yieldPct = purchasePriceD.gt(0)
      ? annualNetGainD.div(purchasePriceD).mul(100).toDP(2).toString()
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
        : ''; // Removed space to fix layout gap

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
          currency: oCurrency,
          totalPrice: purchasePriceD.toFixed(2),
          // Save updated calculated values
          costMonthly: monthlyCostD.toFixed(2),
          netGainMonthly: monthlyNetGainD.toFixed(2),
          netGainYearly: annualNetGainD.toFixed(2),
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
          helperText={isNameTouched && nameHelperText}
          fullWidth
          required
        />
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
            helperText={isPriceTouched && purchasePriceError ? 'Kaufpreis muss > 0 sein' : ''}
          />
          <CurrencySelect value={oCurrency} onChange={(e) => setOCurrency(e.target.value)} />
        </Box>

        {/* Revenue and Cost fields side-by-side */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Monatliche Einnahmen"
            type="text"
            inputProps={{
              inputMode: 'decimal',
              pattern: '[0-9]*[.,]?[0-9]*',
            }}
            value={oMonthlyRevenue}
            onChange={(e) => setOMonthlyRevenue(sanitizeDecimal(e.target.value))}
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Typography>{oCurrency}</Typography>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="Monatliche Kosten"
            type="text"
            inputProps={{
              inputMode: 'decimal',
              pattern: '[0-9]*[.,]?[0-9]*',
            }}
            value={oMonthlyCost}
            onChange={(e) => setOMonthlyCost(sanitizeDecimal(e.target.value))}
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Typography>{oCurrency}</Typography>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Divider />
        <Stack
          spacing={1}
          sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
        >
          <Typography variant="h6">Zusammenfassung</Typography>
          <ResultRow
            label="Monatlicher Gewinn (netto)"
            value={`${fmtMoney(monthlyNetGainD.toString())} ${oCurrency}`}
          />
          <ResultRow
            label="Jährlicher Gewinn (netto)"
            value={`${fmtMoney(annualNetGainD.toString())} ${oCurrency}`}
          />
          <ResultRow label="Anfangsrendite p.a." value={`${yieldPct} %`} isBold />
        </Stack>
      </Stack>
    );
  },
);

export default ObjectForm;
