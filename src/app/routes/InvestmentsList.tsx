import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { TableCell, Typography, Box, Chip, Link } from '@mui/material';
import { useInvestStore } from '../../core/state/useInvestStore';
import CreateInvestmentDialog from '../shared/investment/InvestmentDialog.tsx';
import type {
  ObjectInvestment,
  RealEstateInvestment,
  Depositvestment,
  StockInvestment, // <--- NEW
} from '../../core/domain/types.ts';
import ResourceList, { type HeadCell } from '../shared/ResourceList';
import { useCurrencyConverter } from '../../core/hooks/useCurrencyConverter';
import { fmtMoney } from '../../core/domain/calc.ts';

type InvestmentRow = {
  id: string;
  name: string;
  purchasePrice: number;
  netGainMonthly: number;
  yieldPctYearly: number;
  kind: 'OBJECT' | 'REAL_ESTATE' | 'FIXED_TERM_DEPOSIT' | 'STOCK'; // <--- NEW
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
  const {
    objects,
    realEstates,
    deposits,
    stocks,
    removeObject,
    removeRealEstate,
    removeDeposit,
    removeStock,
  } = useInvestStore(); // <--- NEW: stocks, removeStock
  const { convert, mainCurrency, isConversionActive } = useCurrencyConverter();
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

  const rows: InvestmentRow[] = React.useMemo(() => {
    const allInvestments = [
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
      ...stocks.map((s) => ({
        // <--- NEW: Stocks mapping
        id: s.id,
        name: s.name,
        link: s.link,
        kind: 'STOCK' as const,
        currency: s.currency,
        purchasePrice: parseFloat(s.totalPrice),
        netGainMonthly: parseFloat(s.netGainMonthly),
        yieldPctYearly: parseFloat(s.returnPercent),
      })),
    ];

    if (!isConversionActive) {
      return allInvestments;
    }

    return allInvestments.map((inv) => ({
      ...inv,
      purchasePrice: convert(inv.purchasePrice, inv.currency),
      netGainMonthly: convert(inv.netGainMonthly, inv.currency),
    }));
  }, [objects, realEstates, deposits, stocks, isConversionActive, convert]); // <--- NEW: stocks dependency

  const handleDelete = (row: InvestmentRow) => {
    let originalItem:
      | ObjectInvestment
      | RealEstateInvestment
      | Depositvestment
      | StockInvestment
      | undefined; // <--- NEW type
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
      case 'STOCK': // <--- NEW case
        originalItem = stocks.find((i) => i.id === row.id);
        if (originalItem) {
          setUndoCtx({ item: originalItem, subsetIndex: stocks.indexOf(originalItem) });
          removeStock(row.id);
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
      else if (item.kind === 'STOCK') s.stocks.splice(subsetIndex, 0, item); // <--- NEW
      return s;
    });
    setUndoCtx(null);
  };

  const getKindLabel = (kind: InvestmentRow['kind']) => {
    const map = {
      OBJECT: 'object',
      REAL_ESTATE: 'realEstate',
      FIXED_TERM_DEPOSIT: 'fixedTermDeposit',
      STOCK: 'stock', // <--- NEW
    };
    return t(`investmentsList.kinds.${map[kind]}`);
  };

  const getOriginalItem = (item: InvestmentRow) => {
    if (item.kind === 'OBJECT') return objects.find((o) => o.id === item.id);
    if (item.kind === 'REAL_ESTATE') return realEstates.find((r) => r.id === item.id);
    if (item.kind === 'FIXED_TERM_DEPOSIT') return deposits.find((d) => d.id === item.id);
    if (item.kind === 'STOCK') return stocks.find((s) => s.id === item.id); // <--- NEW
    return undefined;
  };

  return (
    <ResourceList<InvestmentRow>
      items={rows}
      headCells={headCells}
      i18nKeys={i18nKeys}
      DialogComponent={CreateInvestmentDialog as any}
      onDelete={handleDelete}
      onUndo={handleUndo}
      getUndoContext={() => !!undoCtx}
      getOriginalItem={getOriginalItem}
      renderDataCells={(r) => (
        <>
          <TableCell key={`${r.id}-name`}>
            <NameCell name={r.name} link={r.link} />
          </TableCell>
          <TableCell key={`${r.id}-purchasePrice`} align="right">
            {fmtMoney(String(r.purchasePrice))} {isConversionActive ? mainCurrency : r.currency}
          </TableCell>
          <TableCell key={`${r.id}-netGainMonthly`} align="right">
            {fmtMoney(String(r.netGainMonthly))} {isConversionActive ? mainCurrency : r.currency}
          </TableCell>
          <TableCell key={`${r.id}-yieldPctYearly`} align="right">
            {fmtMoney(String(r.yieldPctYearly))} %
          </TableCell>
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
            color={r.kind === 'OBJECT' || r.kind === 'STOCK' ? 'primary' : 'secondary'} // <--- NEW color logic
          />
          <Box sx={{ display: 'grid', gap: 1, mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary" variant="body2">
                {t('investmentsList.investmentAmount')}:
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {fmtMoney(String(r.purchasePrice))} {isConversionActive ? mainCurrency : r.currency}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary" variant="body2">
                {t('investmentsList.monthlyProfit')}:
              </Typography>
              <Typography variant="body2" fontWeight={600} color="success.main">
                {fmtMoney(String(r.netGainMonthly))}{' '}
                {isConversionActive ? mainCurrency : r.currency}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary" variant="body2">
                {t('investmentsList.yield')}:
              </Typography>
              <Typography variant="body2" fontWeight={700} color="primary.main">
                {fmtMoney(String(r.yieldPctYearly))} %
              </Typography>
            </Box>
          </Box>
        </>
      )}
    />
  );
}
// --- END OF FILE InvestmentsList.tsx ---
