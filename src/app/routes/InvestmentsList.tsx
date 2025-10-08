import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Fab,
  IconButton,
  Tooltip,
  Snackbar,
  Button,
  Box,
  useMediaQuery,
  useTheme,
  Typography,
  Chip,
  Link,
  TableSortLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import { useInvestStore } from '../../core/state/useInvestStore';
import CreateInvestmentDialog from '../shared/investment/CreateInvestmentDialog.tsx';
import type {
  ObjectInvestment,
  RealEstateInvestment,
  Depositvestment,
} from '../../core/domain/types.ts';

type Order = 'asc' | 'desc';

type Row = {
  id: string;
  name: string;
  purchasePrice: number;
  netGainMonthly: number;
  yieldPctYearly: number;
  kind: 'OBJECT' | 'REAL_ESTATE' | 'FIXED_TERM_DEPOSIT';
  link?: string;
  currency: string;
};

// Define the structure for our table headers for type safety
interface HeadCell {
  id: keyof Row;
  label: string;
  align?: 'left' | 'right' | 'center' | 'justify';
}

// Generic sorter functions
function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
  if (b[orderBy] < a[orderBy]) return -1;
  if (b[orderBy] > a[orderBy]) return 1;
  return 0;
}

function getComparator<T>(order: Order, orderBy: keyof T): (a: T, b: T) => number {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { objects, realEstates, deposits, removeObject, removeRealEstate, removeDeposit } =
    useInvestStore();

  const [openAdd, setOpenAdd] = React.useState(false);
  const [editItem, setEditItem] = React.useState<{
    id: string;
    kind: Row['kind'];
  } | null>(null);
  const [snack, setSnack] = React.useState<{ open: boolean; msg: string }>({
    open: false,
    msg: '',
  });
  const existingNames = React.useMemo(
    () => [
      ...objects.map((o) => o.name),
      ...realEstates.map((r) => r.name),
      ...deposits.map((d) => d.name),
    ],
    [objects, realEstates, deposits],
  );
  const [undoCtx, setUndoCtx] = React.useState<{
    item: ObjectInvestment | RealEstateInvestment | Depositvestment;
    subsetIndex: number;
  } | null>(null);

  const [order, setOrder] = React.useState<Order>('asc');
  const [orderBy, setOrderBy] = React.useState<keyof Row>('name');

  const headCells: readonly HeadCell[] = React.useMemo(
    () => [
      { id: 'name', label: t('investmentsList.name') },
      { id: 'purchasePrice', label: t('investmentsList.investmentAmount'), align: 'right' },
      { id: 'netGainMonthly', label: t('investmentsList.monthlyProfit'), align: 'right' },
      { id: 'yieldPctYearly', label: t('investmentsList.yield'), align: 'right' },
    ],
    [t],
  );

  const handleRequestSort = (property: keyof Row) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const rows: Row[] = React.useMemo(() => {
    const combined = [
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
    ];
    return combined.sort(getComparator(order, orderBy));
  }, [objects, realEstates, deposits, order, orderBy]);

  const handleDelete = (row: Row, visibleIndex: number) => {
    const subsetIndex = rows.slice(0, visibleIndex).filter((r) => r.kind === row.kind).length;
    let originalItem: ObjectInvestment | RealEstateInvestment | Depositvestment | undefined;

    switch (row.kind) {
      case 'OBJECT':
        originalItem = objects.find((i) => i.id === row.id);
        if (originalItem) removeObject(row.id);
        break;
      case 'REAL_ESTATE':
        originalItem = realEstates.find((i) => i.id === row.id);
        if (originalItem) removeRealEstate(row.id);
        break;
      case 'FIXED_TERM_DEPOSIT':
        originalItem = deposits.find((i) => i.id === row.id);
        if (originalItem) removeDeposit(row.id);
        break;
    }

    if (originalItem) {
      setUndoCtx({ item: originalItem, subsetIndex });
      setSnack({ open: true, msg: t('investmentsList.investmentDeleted') });
    }
  };

  const handleUndo = () => {
    if (!undoCtx) return;
    const { item, subsetIndex } = undoCtx;

    useInvestStore.setState((s) => {
      if (item.kind === 'OBJECT') {
        const before = s.objects.slice(0, subsetIndex);
        const after = s.objects.slice(subsetIndex);
        return { objects: [...before, item, ...after] };
      } else if (item.kind === 'REAL_ESTATE') {
        const before = s.realEstates.slice(0, subsetIndex);
        const after = s.realEstates.slice(subsetIndex);
        return { realEstates: [...before, item, ...after] };
      } else if (item.kind === 'FIXED_TERM_DEPOSIT') {
        const before = s.deposits.slice(0, subsetIndex);
        const after = s.deposits.slice(subsetIndex);
        return { deposits: [...before, item, ...after] };
      }
      return s;
    });

    setUndoCtx(null);
    setSnack({ open: false, msg: '' });
    setTimeout(() => setSnack({ open: true, msg: t('investmentsList.undone') }), 100);
  };

  const getKindLabel = (kind: Row['kind']) => {
    switch (kind) {
      case 'OBJECT':
        return t('investmentsList.kinds.object');
      case 'REAL_ESTATE':
        return t('investmentsList.kinds.realEstate');
      case 'FIXED_TERM_DEPOSIT':
        return t('investmentsList.kinds.fixedTermDeposit');
    }
  };

  // Mobile card view
  if (isMobile) {
    return (
      <>
        <Box sx={{ pb: 10 }}>
          {rows.map((r, idx) => (
            <Paper key={`${r.kind}:${r.id}`} sx={{ p: 2, mb: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  mb: 1,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                    <NameCell name={r.name} link={r.link} />
                  </Typography>
                  <Chip
                    label={getKindLabel(r.kind)}
                    size="small"
                    color={r.kind === 'OBJECT' ? 'primary' : 'secondary'}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton
                    color="primary"
                    size="small"
                    onClick={() => setEditItem({ id: r.id, kind: r.kind })}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton color="error" size="small" onClick={() => handleDelete(r, idx)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
              <Box sx={{ display: 'grid', gap: 1 }}>
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
            </Paper>
          ))}
          {rows.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">{t('investmentsList.noInvestments')}</Typography>
            </Paper>
          )}
        </Box>

        <Fab
          color="primary"
          sx={{ position: 'fixed', right: 24, bottom: 24 }}
          onClick={() => setOpenAdd(true)}
        >
          <AddIcon />
        </Fab>

        {openAdd && (
          <CreateInvestmentDialog onClose={() => setOpenAdd(false)} existingNames={existingNames} />
        )}
        {editItem && (
          <CreateInvestmentDialog
            onClose={() => setEditItem(null)}
            existingNames={existingNames.filter((n) => {
              let originalName: string | undefined;
              if (editItem.kind === 'OBJECT') {
                originalName = objects.find((o) => o.id === editItem.id)?.name;
              } else if (editItem.kind === 'REAL_ESTATE') {
                originalName = realEstates.find((r) => r.id === editItem.id)?.name;
              } else {
                originalName = deposits.find((d) => d.id === editItem.id)?.name;
              }
              return originalName ? n !== originalName : true;
            })}
            editItem={editItem}
          />
        )}
        <Snackbar
          open={snack.open}
          autoHideDuration={4000}
          onClose={() => {
            setSnack({ open: false, msg: '' });
            setUndoCtx(null);
          }}
          message={snack.msg}
          action={
            undoCtx ? (
              <Button color="inherit" size="small" onClick={handleUndo}>
                {t('investmentsList.undo')}
              </Button>
            ) : null
          }
        />
      </>
    );
  }

  // Desktop table view
  return (
    <>
      <TableContainer component={Paper} sx={{ width: '100%' }}>
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell width={100}>{t('investmentsList.actions')}</TableCell>
              {headCells.map((headCell) => (
                <TableCell
                  key={headCell.id}
                  align={headCell.align || 'left'}
                  sortDirection={orderBy === headCell.id ? order : false}
                >
                  <TableSortLabel
                    active={orderBy === headCell.id}
                    direction={orderBy === headCell.id ? order : 'asc'}
                    onClick={() => handleRequestSort(headCell.id)}
                    sx={{
                      flexDirection: 'row',
                      justifyContent: headCell.align === 'right' ? 'flex-end' : 'flex-start',
                      '&': { width: '100%' },
                      '& .MuiTableSortLabel-icon': { marginLeft: 0.5 },
                    }}
                  >
                    {headCell.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, idx) => (
              <TableRow key={`${r.kind}:${r.id}`} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title={t('investmentsList.edit')}>
                      <IconButton
                        color="primary"
                        size="small"
                        onClick={() => setEditItem({ id: r.id, kind: r.kind })}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('investmentsList.delete')}>
                      <IconButton color="error" size="small" onClick={() => handleDelete(r, idx)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
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
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: 'center', color: '#94a3b8', py: 3 }}>
                  {t('investmentsList.noInvestments')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Fab
        color="primary"
        sx={{ position: 'fixed', right: 24, bottom: 24 }}
        onClick={() => setOpenAdd(true)}
      >
        <AddIcon />
      </Fab>

      {openAdd && (
        <CreateInvestmentDialog onClose={() => setOpenAdd(false)} existingNames={existingNames} />
      )}
      {editItem && (
        <CreateInvestmentDialog
          onClose={() => setEditItem(null)}
          existingNames={existingNames.filter((n) => {
            let originalName: string | undefined;
            if (editItem.kind === 'OBJECT') {
              originalName = objects.find((o) => o.id === editItem.id)?.name;
            } else if (editItem.kind === 'REAL_ESTATE') {
              originalName = realEstates.find((r) => r.id === editItem.id)?.name;
            } else {
              originalName = deposits.find((d) => d.id === editItem.id)?.name;
            }
            return originalName ? n !== originalName : true;
          })}
          editItem={editItem}
        />
      )}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => {
          setSnack({ open: false, msg: '' });
          setUndoCtx(null);
        }}
        message={snack.msg}
        action={
          undoCtx ? (
            <Button color="inherit" size="small" onClick={handleUndo}>
              {t('investmentsList.undo')}
            </Button>
          ) : null
        }
      />
    </>
  );
}
