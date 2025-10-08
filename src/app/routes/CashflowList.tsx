// src/components/CashflowList.tsx

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { TableCell, Typography, Stack } from '@mui/material';
import { useCashflowStore, type Cashflow } from '../../core/state/useCashflowStore';
import { useInvestStore } from '../../core/state/useInvestStore';
import { useCreditStore } from '../../core/state/useCreditStore';
import { fmtMoney } from '../../core/domain/calc';
import CashflowDialog from '../shared/CashflowDialog';
import ResourceList, { type HeadCell } from '../shared/ResourceList';
import { ResultRow } from '../shared/SharedComponents.tsx';

interface EnrichedRow extends Cashflow {
  investmentName: string;
  creditName: string;
  purchasePrice: number;
  investmentGain: number;
  monthlyLoss: number;
  yieldPct: number;
}

export default function CashflowList() {
  const { t } = useTranslation();
  const { cashflows, removeCashflow } = useCashflowStore();
  const { objects, realEstates } = useInvestStore();
  const credits = useCreditStore((s) => s.credits);
  const allInvestments = React.useMemo(() => [...objects, ...realEstates], [objects, realEstates]);
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
        const purchasePrice = parseFloat(investment?.totalPrice || investment?.startAmount || '0');
        const cashflowMonthlyNum = parseFloat(cf.cashflowMonthly);
        return {
          ...cf,
          investmentName: investment?.name || '—',
          creditName: credit?.name || '—',
          purchasePrice,
          investmentGain: parseFloat(investment?.netGainMonthly || '0'),
          monthlyLoss: credit ? parseFloat(credit.totalMonthly || '0') : 0,
          yieldPct: purchasePrice > 0 ? ((cashflowMonthlyNum * 12) / purchasePrice) * 100 : 0,
        };
      }),
    [cashflows, allInvestments, credits],
  );

  const handleDelete = (item: Cashflow) => {
    const index = cashflows.findIndex((c) => c.id === item.id);
    if (index > -1) {
      setUndoCtx({ item, index });
      removeCashflow(item.id);
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

  return (
    <ResourceList<EnrichedRow>
      items={rows}
      headCells={headCells}
      i18nKeys={i18nKeys}
      DialogComponent={CashflowDialog as any}
      onDelete={handleDelete}
      onUndo={handleUndo}
      getUndoContext={() => !!undoCtx}
      renderDataCells={(row) => (
        <>
          <TableCell key={`${row.id}-name`} sx={{ fontWeight: 500 }}>
            {row.name}
          </TableCell>
          <TableCell key={`${row.id}-investmentName`}>{row.investmentName}</TableCell>
          <TableCell key={`${row.id}-creditName`}>{row.creditName}</TableCell>
          <TableCell
            key={`${row.id}-cashflowMonthly`}
            align="right"
            sx={{ color: parseFloat(row.cashflowMonthly) < 0 ? 'error.main' : 'success.main' }}
          >
            {fmtMoney(String(row.cashflowMonthly))} €
          </TableCell>
          <TableCell key={`${row.id}-yieldPct`} align="right">
            {fmtMoney(String(row.yieldPct))} %
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
            <ResultRow
              label={t('cashflowList.netProfitMonthly')}
              value={`${fmtMoney(String(row.cashflowMonthly))} €`}
            />
            <ResultRow label={t('cashflowList.credit')} value={row.creditName} />
          </Stack>
        </>
      )}
    />
  );
}
