import * as React from 'react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
    const { addObject, updateObject, objects } = useInvestStore.getState();
    const existingObject = editId ? objects.find((o) => o.id === editId) : undefined;

    // Initialize values based on existing object or defaults
    const initCost = existingObject?.costMonthly ? D(existingObject.costMonthly) : D(0);
    const initNet = existingObject?.netGainMonthly ? D(existingObject.netGainMonthly) : D(120);
    const initRevenue = existingObject ? initNet.add(initCost) : D(120);

    const [oName, setOName] = React.useState(existingObject?.name || t('objectForm.defaultName'));
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
      ? t('objectForm.nameHelperEmpty')
      : existingNames.includes(trimmedName)
        ? t('objectForm.nameHelperInUse')
        : '';

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
          label={t('objectForm.nameLabel')}
          value={oName}
          onChange={(e) => setOName(e.target.value)}
          onBlur={() => setIsNameTouched(true)}
          error={isNameTouched && nameError}
          helperText={isNameTouched && nameHelperText}
          fullWidth
          required
        />
        <TextField
          label={t('objectForm.linkLabel')}
          value={oLink}
          onChange={(e) => setOLink(e.target.value)}
          placeholder={t('objectForm.linkPlaceholder')}
          fullWidth
        />
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <PriceInput
            label={t('objectForm.purchasePriceLabel')}
            value={oPurchasePrice}
            onChange={(e) => setOPurchasePrice(sanitizeDecimal(e.target.value))}
            onBlur={() => setIsPriceTouched(true)}
            error={isPriceTouched && purchasePriceError}
            helperText={
              isPriceTouched && purchasePriceError ? t('objectForm.purchasePriceHelper') : ''
            }
          />
          <CurrencySelect value={oCurrency} onChange={(e) => setOCurrency(e.target.value)} />
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label={t('objectForm.monthlyRevenueLabel')}
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
            label={t('objectForm.monthlyCostLabel')}
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
          <Typography variant="h6">{t('objectForm.summaryTitle')}</Typography>
          <ResultRow
            label={t('objectForm.monthlyNetGainLabel')}
            value={`${fmtMoney(monthlyNetGainD.toString())} ${oCurrency}`}
          />
          <ResultRow
            label={t('objectForm.annualNetGainLabel')}
            value={`${fmtMoney(annualNetGainD.toString())} ${oCurrency}`}
          />
          <ResultRow label={t('objectForm.initialYieldLabel')} value={`${yieldPct} %`} isBold />
        </Stack>
      </Stack>
    );
  },
);

export default ObjectForm;
