// src/components/InvestmentsList.tsx

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { TableCell, Typography, Box, Chip, Link } from '@mui/material';
import { useInvestStore } from '../../core/state/useInvestStore';
import InvestmentDialog from '../shared/investment/InvestmentDialog.tsx';
import type {
  ObjectInvestment,
  RealEstateInvestment,
  Depositvestment,
} from '../../core/domain/types.ts';
import ResourceList, { type HeadCell } from '../shared/ResourceList'; // <-- IMPORT

// A new combined type for our list items
type InvestmentRow = {
  id: string;
  name: string;
  purchasePrice: number;
  netGainMonthly: number;
  yieldPctYearly: number;
  kind: 'OBJECT' | 'REAL_ESTATE' | 'FIXED_TERM_DEPOSIT';
  link?: string;
  currency: string;
};

const NameCell = ({ name, link }: { name: string; link?: string }) => {
  if (link && (link.startsWith('http://') || link.startsWith('https://'))) {
    return (
      <Link href={link} target="_blank" rel="noopener noreferrer" underline="hover">
        {name}
      </Link>
    );
  }
  return <>{name}</>;
};

export default function InvestmentsList() {
  const { t } = useTranslation();
  const { objects, realEstates, deposits, removeObject, removeRealEstate, removeDeposit } =
    useInvestStore();
  const [undoCtx, setUndoCtx] = React.useState<{ item: any; subsetIndex: number } | null>(null);

  const i18nKeys = {
    empty: 'investmentsList.noInvestments',
    deleted: 'investmentsList.investmentDeleted',
    undone: 'investmentsList.undone',
    actions: 'investmentsList.actions',
    edit: 'investmentsList.edit',
    delete: 'investmentsList.delete',
  };

  const headCells: readonly HeadCell<InvestmentRow>[] = React.useMemo(
    () => [
      { id: 'name', label: t('investmentsList.name') },
      { id: 'purchasePrice', label: t('investmentsList.investmentAmount'), align: 'right' },
      { id: 'netGainMonthly', label: t('investmentsList.monthlyProfit'), align: 'right' },
      { id: 'yieldPctYearly', label: t('investmentsList.yield'), align: 'right' },
    ],
    [t],
  );

  const rows: InvestmentRow[] = React.useMemo(
    () => [
      ...objects.map((o) => ({
        id: o.id,
        name: o.name,
        link: o.link,
        kind: 'OBJECT' as const,
        currency: o.currency,
        purchasePrice: parseFloat(o.startAmount),
        netGainMonthly: parseFloat(o.netGainMonthly),
        yieldPctYearly: parseFloat(o.returnPercent),
      })),
      ...realEstates.map((r) => ({
        id: r.id,
        name: r.name,
        link: r.link,
        kind: 'REAL_ESTATE' as const,
        currency: r.currency,
        purchasePrice: parseFloat(r.totalPrice),
        netGainMonthly: parseFloat(r.netGainMonthly),
        yieldPctYearly: parseFloat(r.returnPercent),
      })),
      ...deposits.map((d) => ({
        id: d.id,
        name: d.name,
        link: d.link,
        kind: 'FIXED_TERM_DEPOSIT' as const,
        currency: d.currency,
        purchasePrice: parseFloat(d.startAmount),
        netGainMonthly: parseFloat(d.netGainMonthly),
        yieldPctYearly: parseFloat(d.returnPercent),
      })),
    ],
    [objects, realEstates, deposits],
  );

  const handleDelete = (row: InvestmentRow) => {
    let originalItem: ObjectInvestment | RealEstateInvestment | Depositvestment | undefined;
    switch (row.kind) {
      case 'OBJECT':
        originalItem = objects.find((i) => i.id === row.id);
        if (originalItem) {
          setUndoCtx({ item: originalItem, subsetIndex: objects.indexOf(originalItem) });
          removeObject(row.id);
        }
        break;
      case 'REAL_ESTATE':
        originalItem = realEstates.find((i) => i.id === row.id);
        if (originalItem) {
          setUndoCtx({ item: originalItem, subsetIndex: realEstates.indexOf(originalItem) });
          removeRealEstate(row.id);
        }
        break;
      case 'FIXED_TERM_DEPOSIT':
        originalItem = deposits.find((i) => i.id === row.id);
        if (originalItem) {
          setUndoCtx({ item: originalItem, subsetIndex: deposits.indexOf(originalItem) });
          removeDeposit(row.id);
        }
        break;
    }
  };

  const handleUndo = () => {
    if (!undoCtx) return;
    const { item, subsetIndex } = undoCtx;
    useInvestStore.setState((s) => {
      if (item.kind === 'OBJECT') s.objects.splice(subsetIndex, 0, item);
      else if (item.kind === 'REAL_ESTATE') s.realEstates.splice(subsetIndex, 0, item);
      else if (item.kind === 'FIXED_TERM_DEPOSIT') s.deposits.splice(subsetIndex, 0, item);
      return s;
    });
    setUndoCtx(null);
  };

  const getKindLabel = (kind: InvestmentRow['kind']) => {
    const map = {
      OBJECT: 'object',
      REAL_ESTATE: 'realEstate',
      FIXED_TERM_DEPOSIT: 'fixedTermDeposit',
    };
    return t(`investmentsList.kinds.${map[kind]}`);
  };

  const getOriginalName = (item: InvestmentRow) => {
    if (item.kind === 'OBJECT') return objects.find((o) => o.id === item.id)?.name || '';
    if (item.kind === 'REAL_ESTATE') return realEstates.find((r) => r.id === item.id)?.name || '';
    return deposits.find((d) => d.id === item.id)?.name || '';
  };

  return (
    <ResourceList<InvestmentRow>
      items={rows}
      headCells={headCells}
      i18nKeys={i18nKeys}
      DialogComponent={InvestmentDialog as any} // Cast as `any` because its props are slightly different
      onDelete={handleDelete}
      onUndo={handleUndo}
      getUndoContext={() => !!undoCtx}
      getOriginalName={getOriginalName}
      renderDataCells={(r) => (
        <>
          <TableCell>
            <NameCell name={r.name} link={r.link} />
          </TableCell>
          <TableCell align="right">
            {r.purchasePrice} {r.currency}
          </TableCell>
          <TableCell align="right">
            {r.netGainMonthly} {r.currency}
          </TableCell>
          <TableCell align="right">{r.yieldPctYearly} %</TableCell>
        </>
      )}
      renderCard={(r) => (
        <>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
            <NameCell name={r.name} link={r.link} />
          </Typography>
          <Chip
            label={getKindLabel(r.kind)}
            size="small"
            color={r.kind === 'OBJECT' ? 'primary' : 'secondary'}
          />
          <Box sx={{ display: 'grid', gap: 1, mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary" variant="body2">
                {t('investmentsList.investmentAmount')}:
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {r.purchasePrice} {r.currency}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary" variant="body2">
                {t('investmentsList.monthlyProfit')}:
              </Typography>
              <Typography variant="body2" fontWeight={600} color="success.main">
                {r.netGainMonthly} {r.currency}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary" variant="body2">
                {t('investmentsList.yield')}:
              </Typography>
              <Typography variant="body2" fontWeight={700} color="primary.main">
                {r.yieldPctYearly} %
              </Typography>
            </Box>
          </Box>
        </>
      )}
    />
  );
}
