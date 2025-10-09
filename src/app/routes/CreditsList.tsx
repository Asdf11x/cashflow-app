// src/components/CreditsList.tsx

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { TableCell, Typography, Box } from '@mui/material';
import { useCreditStore } from '../../core/state/useCreditStore';
import { fmtMoney } from '../../core/domain/calc';
import type { Credit } from '../../core/domain/types.ts';
import CreditCreateDialog from '../shared/credit/CreditDialog.tsx';
import ResourceList, { type HeadCell } from '../shared/ResourceList';
import { useCurrencyConverter } from '../../core/hooks/useCurrencyConverter.ts';

// Define a new type for the row data, which includes converted numbers and original currency
type CreditRow = Omit<Credit, 'principal' | 'totalMonthly'> & {
  principal: number;
  totalMonthly: number;
  currency: string; // Keep original currency for display fallback
};

export default function CreditsList() {
  const { t } = useTranslation();
  const { credits, removeCredit } = useCreditStore();
  const { convert, mainCurrency, isConversionActive } = useCurrencyConverter();
  const [undoCtx, setUndoCtx] = React.useState<{ item: Credit; index: number } | null>(null);

  const i18nKeys = {
    empty: 'creditsList.noCredits',
    deleted: 'creditsList.creditDeleted',
    undone: 'creditsList.undone',
    actions: 'creditsList.actions',
    edit: 'creditsList.edit',
    delete: 'creditsList.delete',
  };

  const headCells: readonly HeadCell<CreditRow>[] = React.useMemo(
    () => [
      { id: 'name', label: t('creditsList.name') },
      { id: 'principal', label: t('creditsList.principal'), align: 'right' },
      { id: 'totalMonthly', label: t('creditsList.monthlyRate'), align: 'right' },
      { id: 'rateAnnualPct', label: t('creditsList.interestRate'), align: 'right' },
    ],
    [t],
  );

  const rows: CreditRow[] = React.useMemo(() => {
    const allCredits = credits.map((c) => ({
      ...c,
      principal: parseFloat(c.principal),
      totalMonthly: parseFloat(c.totalMonthly || '0'),
    }));

    if (!isConversionActive) {
      return allCredits;
    }

    return allCredits.map((c) => ({
      ...c,
      principal: convert(c.principal, c.currency),
      totalMonthly: convert(c.totalMonthly, c.currency),
    }));
  }, [credits, isConversionActive, convert]);

  const handleDelete = (row: CreditRow) => {
    const index = credits.findIndex((c) => c.id === row.id);
    const originalItem = credits[index];
    if (originalItem) {
      setUndoCtx({ item: originalItem, index });
      removeCredit(row.id);
    }
  };

  const handleUndo = () => {
    if (!undoCtx) return;
    const { item, index } = undoCtx;
    // useCreditStore has no direct splice method, so we use setState
    const currentCredits = useCreditStore.getState().credits;
    const newCredits = [...currentCredits];
    newCredits.splice(index, 0, item);
    useCreditStore.setState({ credits: newCredits });
    setUndoCtx(null);
  };

  const getOriginalItem = (row: CreditRow) => {
    return credits.find((c) => c.id === row.id);
  };

  return (
    <ResourceList<CreditRow>
      items={rows}
      headCells={headCells}
      i18nKeys={i18nKeys}
      DialogComponent={CreditCreateDialog as any}
      onDelete={handleDelete}
      onUndo={handleUndo}
      getUndoContext={() => !!undoCtx}
      getOriginalItem={getOriginalItem}
      renderDataCells={(c) => (
        <>
          <TableCell key={`${c.id}-name`}>{c.name}</TableCell>
          <TableCell key={`${c.id}-principal`} align="right">
            {fmtMoney(String(c.principal))} {isConversionActive ? mainCurrency : c.currency}
          </TableCell>
          <TableCell key={`${c.id}-totalMonthly`} align="right">
            {fmtMoney(String(c.totalMonthly))} {isConversionActive ? mainCurrency : c.currency}
          </TableCell>
          <TableCell key={`${c.id}-rateAnnualPct`} align="right">
            {c.rateAnnualPct} %
          </TableCell>
        </>
      )}
      renderCard={(c) => (
        <>
          <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
            {c.name}
          </Typography>
          <Box sx={{ display: 'grid', gap: 1, mt: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary" variant="body2">
                {t('creditsList.principal')}:
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {fmtMoney(String(c.principal))} {isConversionActive ? mainCurrency : c.currency}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary" variant="body2">
                {t('creditsList.monthlyRate')}:
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {fmtMoney(String(c.totalMonthly))} {isConversionActive ? mainCurrency : c.currency}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary" variant="body2">
                {t('creditsList.interestRate')}:
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {c.rateAnnualPct} %
              </Typography>
            </Box>
          </Box>
        </>
      )}
    />
  );
}
