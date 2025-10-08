import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Autocomplete,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useTranslation } from 'react-i18next'; // <-- 1. IMPORT THE HOOK
import { useInvestStore } from '../../core/state/useInvestStore';
import { useCreditStore } from '../../core/state/useCreditStore';
import { useCashflowStore, type Cashflow } from '../../core/state/useCashflowStore';
import { computeCashflowMonthly, fmtMoney } from '../../core/domain/calc';
import type { ObjectInvestment, RealEstateInvestment } from '../../core/domain/types';
import type Decimal from 'decimal.js';

type Option = { id: string; label: string };

type Props = {
  onClose: () => void;
  editItem?: Cashflow | null;
  existingNames: string[];
};

export default function CashflowDialog({ onClose, editItem, existingNames }: Props) {
  const { t } = useTranslation(); // <-- 2. INITIALIZE THE HOOK
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const { objects, realEstates } = useInvestStore.getState();
  const { credits } = useCreditStore.getState();
  const { addCashflow, updateCashflow } = useCashflowStore.getState();

  const allInvestments = React.useMemo(() => [...objects, ...realEstates], [objects, realEstates]);

  const [name, setName] = React.useState(editItem?.name || 'Neue Abschätzung');
  const [isNameTouched, setIsNameTouched] = React.useState(false);

  const invOptions: Option[] = React.useMemo(
    () => allInvestments.map((i) => ({ id: i.id, label: i.name })),
    [allInvestments],
  );
  const crdOptions: Option[] = React.useMemo(
    () => credits.map((c) => ({ id: c.id, label: c.name })),
    [credits],
  );

  const [inv, setInv] = React.useState<Option | null>(() =>
    editItem ? invOptions.find((o) => o.id === editItem.investmentId) || null : null,
  );
  const [crd, setCrd] = React.useState<Option | null>(() => {
    if (editItem?.creditId) {
      const credit = credits.find((c) => c.id === editItem.creditId);
      return credit ? { id: credit.id, label: credit.name } : null;
    }
    return null;
  });

  const cashflowPreview: Decimal | null = React.useMemo(() => {
    if (!inv) return null;
    const i = allInvestments.find((x) => x.id === inv.id);
    const c = crd ? credits.find((x) => x.id === crd.id) : null;
    if (!i) return null;
    return computeCashflowMonthly(i as ObjectInvestment | RealEstateInvestment, c || null);
  }, [inv, crd, allInvestments, credits]);

  const trimmedName = name.trim();
  const nameError = !trimmedName || existingNames.includes(trimmedName);

  // 3. REPLACE STRINGS WITH t() FUNCTION CALLS
  const nameHelperText = !trimmedName
    ? t('cashflowDialog.nameHelperEmpty')
    : existingNames.includes(trimmedName)
      ? t('cashflowDialog.nameHelperInUse')
      : '';

  const handleSave = () => {
    if (!inv || !trimmedName || nameError) return;
    const creditId = crd ? crd.id : null;

    if (editItem) {
      updateCashflow(editItem.id, trimmedName, inv.id, creditId);
    } else {
      addCashflow(trimmedName, inv.id, creditId);
    }
    onClose();
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
      <DialogTitle>
        {editItem ? t('cashflowDialog.editTitle') : t('cashflowDialog.createTitle')}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            label={t('cashflowDialog.nameLabel')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setIsNameTouched(true)}
            error={isNameTouched && nameError}
            helperText={isNameTouched && nameHelperText}
            fullWidth
            required
          />
          <Autocomplete
            options={invOptions}
            value={inv}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            getOptionLabel={(o) => o.label}
            onChange={(_, v) => setInv(v)}
            renderInput={(p) => (
              <TextField {...p} label={t('cashflowDialog.selectInvestmentLabel')} required />
            )}
          />
          <Autocomplete
            options={crdOptions}
            value={crd}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            getOptionLabel={(o) => o.label}
            onChange={(_, v) => setCrd(v)}
            renderInput={(p) => (
              <TextField
                {...p}
                label={`${t('cashflowDialog.selectCreditLabel')} ${t('common.optional')}`}
              />
            )}
          />

          {cashflowPreview !== null && (
            <Typography sx={{ pt: 1, fontWeight: 'bold' }}>
              {t('cashflowDialog.netProfitPerMonth')}{' '}
              <span style={{ color: cashflowPreview.isNegative() ? '#d32f2f' : '#2e7d32' }}>
                {fmtMoney(cashflowPreview.toString())} €
              </span>
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          variant="contained"
          disabled={!inv || !trimmedName || nameError}
          onClick={handleSave}
        >
          {editItem ? t('common.save') : t('common.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
