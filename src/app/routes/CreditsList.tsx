import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { TableCell, Typography, Box } from '@mui/material';
import { useCreditStore } from '../../core/state/useCreditStore';
import { fmtMoney } from '../../core/domain/calc';
import type { Credit } from '../../core/domain/types.ts';
import CreditDialog from '../shared/credit/CreditDialog.tsx';
import ResourceList, { type HeadCell } from '../shared/ResourceList'; // <-- IMPORT

export default function CreditsList() {
  const { t } = useTranslation();
  const { credits, removeCredit } = useCreditStore();
  const [undoCtx, setUndoCtx] = React.useState<{ item: Credit; index: number } | null>(null);

  const i18nKeys = {
    empty: 'creditsList.noCredits',
    deleted: 'creditsList.creditDeleted',
    undone: 'creditsList.undone',
    actions: 'creditsList.actions',
    edit: 'creditsList.edit',
    delete: 'creditsList.delete',
  };

  const headCells: readonly HeadCell<Credit>[] = React.useMemo(
    () => [
      { id: 'name', label: t('creditsList.name') },
      { id: 'principal', label: t('creditsList.principal'), align: 'right' },
      { id: 'totalMonthly', label: t('creditsList.monthlyRate'), align: 'right' },
      { id: 'rateAnnualPct', label: t('creditsList.interestRate'), align: 'right' },
    ],
    [t],
  );

  const handleDelete = (credit: Credit) => {
    const index = credits.findIndex((c) => c.id === credit.id);
    if (index > -1) {
      setUndoCtx({ item: credit, index });
      removeCredit(credit.id);
    }
  };

  const handleUndo = () => {
    if (!undoCtx) return;
    const { item, index } = undoCtx;
    useCreditStore.setState((s) => {
      const newCredits = [...s.credits];
      newCredits.splice(index, 0, item);
      return { credits: newCredits };
    });
    setUndoCtx(null);
  };

  return (
    <ResourceList<Credit>
      items={credits}
      headCells={headCells}
      i18nKeys={i18nKeys}
      DialogComponent={CreditDialog}
      onDelete={handleDelete}
      onUndo={handleUndo}
      getUndoContext={() => !!undoCtx}
      renderDataCells={(c) => (
        <>
          <TableCell>{c.name}</TableCell>
          <TableCell align="right">
            {fmtMoney(c.principal)} {c.currency}
          </TableCell>
          <TableCell align="right">
            {fmtMoney(c.totalMonthly || '0')} {c.currency}
          </TableCell>
          <TableCell align="right">{c.rateAnnualPct} %</TableCell>
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
                {fmtMoney(c.principal)} {c.currency}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary" variant="body2">
                {t('creditsList.monthlyRate')}:
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {fmtMoney(c.totalMonthly || '0')} {c.currency}
              </Typography>
            </Box>
          </Box>
        </>
      )}
    />
  );
}
