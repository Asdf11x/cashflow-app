// src/components/CashflowList.tsx

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { TableCell, Typography, Stack } from '@mui/material';
import { useCashflowStore, type Cashflow } from '../../core/state/useCashflowStore';
import { useInvestStore } from '../../core/state/useInvestStore';
import { useCreditStore } from '../../core/state/useCreditStore';
// ASSUMPTION: fmtMoney is a general formatter from core/domain/calc
import { fmtMoney } from '../../core/domain/calc';
import CashflowDialog from '../shared/CashflowDialog';
import ResourceList, { type HeadCell } from '../shared/ResourceList';
import { ResultRow } from '../shared/SharedComponents.tsx';
import { useCurrencyConverter } from '../../core/hooks/useCurrencyConverter.ts';

// EnrichedRow extends the base Cashflow type, so its properties must be compatible.
interface EnrichedRow extends Cashflow {
  investmentName: string;
  creditName: string;
  yieldPct: number;
  currency: string;
}

// NEW HELPER: Formats currency without decimals.
const fmtCurrency = (amount: number | string) => {
  // We assume fmtMoney for locale grouping and Math.round for no decimals.
  return fmtMoney(String(Math.round(Number(amount))));
};

// NEW HELPER: Formats percentage with standard decimals (assumed by original fmtMoney).
const fmtPercentage = (amount: number | string) => {
  // For percentages, we use the original fmtMoney to retain any decimal precision.
  return fmtMoney(String(amount));
};

export default function CashflowList() {
  const { t } = useTranslation();
  const { cashflows, removeCashflow } = useCashflowStore();
  const { objects, realEstates, deposits } = useInvestStore();
  const credits = useCreditStore((s) => s.credits);
  const { convert, mainCurrency, isConversionActive } = useCurrencyConverter();
  const allInvestments = React.useMemo(
    () => [...objects, ...realEstates, ...deposits],
    [objects, realEstates, deposits],
  );
  const [undoCtx, setUndoCtx] = React.useState<{ item: Cashflow; index: number } | null>(null);

  const i18nKeys = {
    empty: 'cashflowList.noEstimations',
    deleted: 'cashflowList.estimationDeleted',
    undone: 'cashflowList.undone',
    actions: 'cashflowList.actions',
    edit: 'cashflowList.edit',
    delete: 'cashflowList.delete',
  };

  const headCells: readonly HeadCell<EnrichedRow>[] = React.useMemo(
    () => [
      { id: 'name', label: t('cashflowList.estimationName') },
      { id: 'investmentName', label: t('cashflowList.investment') },
      { id: 'creditName', label: t('cashflowList.credit') },
      { id: 'cashflowMonthly', label: t('cashflowList.netProfitMonthly'), align: 'right' },
      { id: 'yieldPct', label: t('cashflowList.yield'), align: 'right' },
    ],
    [t],
  );

  const rows: EnrichedRow[] = React.useMemo(
    () =>
      cashflows.map((cf) => {
        const investment = allInvestments.find((i) => i.id === cf.investmentId);
        const credit = cf.creditId ? credits.find((c) => c.id === cf.creditId) : null;

        const originalPurchasePrice = parseFloat(
          investment?.totalPrice || investment?.startAmount || '0',
        );
        const originalCashflowMonthly = parseFloat(cf.cashflowMonthly);
        const originalCurrency = investment?.currency || mainCurrency;

        const yieldPct =
          originalPurchasePrice > 0
            ? ((originalCashflowMonthly * 12) / originalPurchasePrice) * 100
            : 0;

        const displayCashflowMonthly = isConversionActive
          ? convert(originalCashflowMonthly, originalCurrency)
          : originalCashflowMonthly;

        return {
          ...cf,
          investmentName: investment?.name || '—',
          creditName: credit?.name || '—',
          // FIX: Convert the final display value back to a string to match the `Cashflow` base type.
          cashflowMonthly: String(displayCashflowMonthly),
          yieldPct: yieldPct,
          currency: originalCurrency,
        };
      }),
    [cashflows, allInvestments, credits, isConversionActive, convert, mainCurrency],
  );

  const handleDelete = (row: EnrichedRow) => {
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

  const getOriginalItem = (row: EnrichedRow) => {
    return cashflows.find((c) => c.id === row.id);
  };

  return (
    <ResourceList<EnrichedRow>
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
          {/* NOTE: Estimation name is not assumed to have a link */}
          <TableCell key={`${row.id}-name`} sx={{ fontWeight: 500 }}>
            {row.name}
          </TableCell>
          <TableCell key={`${row.id}-investmentName`}>{row.investmentName}</TableCell>
          <TableCell key={`${row.id}-creditName`}>{row.creditName}</TableCell>
          <TableCell
            key={`${row.id}-cashflowMonthly`}
            align="right"
            sx={{
              color: parseFloat(row.cashflowMonthly) < 0 ? 'error.main' : 'success.main',
              fontWeight: 500,
            }}
          >
            {/* MODIFIED: Use fmtCurrency (no decimals) */}
            {fmtCurrency(row.cashflowMonthly)} {isConversionActive ? mainCurrency : row.currency}
          </TableCell>
          <TableCell key={`${row.id}-yieldPct`} align="right" sx={{ fontWeight: 500 }}>
            {/* MODIFIED: Use fmtPercentage (with decimals) */}
            {fmtPercentage(row.yieldPct)} %
          </TableCell>
        </>
      )}
      renderCard={(row) => (
        <>
          <Typography variant="h6" sx={{ fontWeight: 600, flex: 1, mr: 1 }}>
            {row.name}
          </Typography>
          <Stack spacing={1} sx={{ mt: 1 }}>
            <ResultRow label={t('cashflowList.investment')} value={row.investmentName} />
            <ResultRow label={t('cashflowList.credit')} value={row.creditName} />
            <ResultRow
              label={t('cashflowList.netProfitMonthly')}
              value={`${fmtCurrency(row.cashflowMonthly)} ${
                isConversionActive ? mainCurrency : row.currency
              }`}
            />
            <ResultRow label={t('cashflowList.yield')} value={`${fmtPercentage(row.yieldPct)} %`} />
          </Stack>
        </>
      )}
    />
  );
}
