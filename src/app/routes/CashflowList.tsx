// src/components/CashflowList.tsx

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { TableCell, Typography, Box } from '@mui/material';
import { useCashflowStore, type Cashflow } from '../../core/state/useCashflowStore';
import { fmtMoney } from '../../core/domain/calc';
import CashflowDialog from '../shared/CashflowDialog';
import ResourceList, { type HeadCell } from '../shared/ResourceList';
import { useCurrencyConverter } from '../../core/hooks/useCurrencyConverter';
// NEW: Import the centralized hook and the EnrichedCashflow type
import { useEnrichedCashflows, type EnrichedCashflow } from '../../core/hooks/useEnrichedCashflows';

// Helper to format currency (assumes integers).
const fmtCurrency = (amount: number) => {
  return fmtMoney(String(amount));
};

// Helper to format percentage with decimals.
const fmtPercentage = (amount: number) => {
  // Retain decimal precision for yield percentages
  return fmtMoney(String(amount));
};

export default function CashflowList() {
  const { t } = useTranslation();
  // Still need raw cashflows for undo/delete logic that modifies the store
  const { cashflows, removeCashflow } = useCashflowStore();
  const { mainCurrency, isConversionActive } = useCurrencyConverter();
  const [undoCtx, setUndoCtx] = React.useState<{ item: Cashflow; index: number } | null>(null);

  // Use the new centralized hook to get the consistently calculated rows
  const rows = useEnrichedCashflows();

  const i18nKeys = {
    empty: 'cashflowList.noEstimations',
    deleted: 'cashflowList.estimationDeleted',
    undone: 'cashflowList.undone',
    actions: 'cashflowList.actions',
    edit: 'cashflowList.edit',
    delete: 'cashflowList.delete',
  };

  const headCells: readonly HeadCell<EnrichedCashflow>[] = React.useMemo(
    () => [
      { id: 'name', label: t('cashflowList.estimationName') },
      { id: 'investmentName', label: t('cashflowList.investment') },
      { id: 'creditName', label: t('cashflowList.credit') },
      { id: 'displayCashflowMonthly', label: t('cashflowList.netProfitMonthly'), align: 'right' },
      { id: 'displayCashflowYearly', label: t('cashflowList.netProfitYearly'), align: 'right' },
      { id: 'yieldPct', label: t('cashflowList.yield'), align: 'right' },
    ],
    [t],
  );

  const handleDelete = (row: EnrichedCashflow) => {
    const index = cashflows.findIndex((c) => c.id === row.id);
    if (index > -1) {
      setUndoCtx({ item: cashflows[index], index });
      removeCashflow(row.id);
    }
  };

  const handleUndo = () => {
    if (!undoCtx) return;
    const { item, index } = undoCtx;
    useCashflowStore.setState((s) => {
      const newCashflows = [...s.cashflows];
      newCashflows.splice(index, 0, item);
      return { cashflows: newCashflows };
    });
    setUndoCtx(null);
  };

  const getOriginalItem = (row: EnrichedCashflow) => {
    return cashflows.find((c) => c.id === row.id);
  };

  return (
    <ResourceList<EnrichedCashflow>
      items={rows}
      headCells={headCells}
      i18nKeys={i18nKeys}
      DialogComponent={CashflowDialog as any}
      onDelete={handleDelete}
      onUndo={handleUndo}
      getUndoContext={() => !!undoCtx}
      getOriginalItem={getOriginalItem}
      renderDataCells={(row) => (
        <>
          <TableCell sx={{ fontWeight: 500 }}>{row.name}</TableCell>
          <TableCell>{row.investmentName}</TableCell>
          <TableCell>{row.creditName}</TableCell>
          <TableCell
            align="right"
            sx={{
              color: row.displayCashflowMonthly < 0 ? 'error.main' : 'success.main',
              fontWeight: 500,
            }}
          >
            {fmtCurrency(row.displayCashflowMonthly)}{' '}
            {isConversionActive ? mainCurrency : row.currency}
          </TableCell>
          <TableCell
            align="right"
            sx={{
              color: row.displayCashflowYearly < 0 ? 'error.main' : 'success.main',
              fontWeight: 700, // Make yearly value stand out
            }}
          >
            {fmtCurrency(row.displayCashflowYearly)}{' '}
            {isConversionActive ? mainCurrency : row.currency}
          </TableCell>
          <TableCell align="right" sx={{ fontWeight: 500 }}>
            {fmtPercentage(row.yieldPct)} %
          </TableCell>
        </>
      )}
      renderCard={(row) => (
        <Box sx={{ display: 'grid', gap: 1, mt: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography color="text.secondary" variant="body2">
              {t('cashflowList.investment')}:
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {row.investmentName}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography color="text.secondary" variant="body2">
              {t('cashflowList.credit')}:
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {row.creditName}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography color="text.secondary" variant="body2">
              {t('cashflowList.netProfitMonthly')}:
            </Typography>
            <Typography
              variant="body2"
              fontWeight={600}
              color={row.displayCashflowMonthly < 0 ? 'error.main' : 'success.main'}
            >
              {fmtCurrency(row.displayCashflowMonthly)}{' '}
              {isConversionActive ? mainCurrency : row.currency}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography color="text.secondary" variant="body2">
              {t('cashflowList.netProfitYearly')}:
            </Typography>
            <Typography
              variant="body2"
              fontWeight={700}
              color={row.displayCashflowYearly < 0 ? 'error.main' : 'success.main'}
            >
              {fmtCurrency(row.displayCashflowYearly)}{' '}
              {isConversionActive ? mainCurrency : row.currency}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography color="text.secondary" variant="body2">
              {t('cashflowList.yield')}:
            </Typography>
            <Typography variant="body2" fontWeight={700} color="primary.main">
              {fmtPercentage(row.yieldPct)} %
            </Typography>
          </Box>
        </Box>
      )}
    />
  );
}
