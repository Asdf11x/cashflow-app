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
  TableSortLabel,
  Fab,
  IconButton,
  Tooltip,
  Snackbar,
  Button,
  useMediaQuery,
  useTheme,
  Box,
  Typography,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import { useCashflowStore, type Cashflow } from '../../core/state/useCashflowStore';
import { useInvestStore } from '../../core/state/useInvestStore';
import { useCreditStore } from '../../core/state/useCreditStore';
import { fmtMoney } from '../../core/domain/calc';
import CashflowDialog from '../shared/CashflowDialog';
import { ResultRow } from '../shared/SharedComponents.tsx';

type Order = 'asc' | 'desc';

interface EnrichedRow extends Cashflow {
  investmentName: string;
  creditName: string;
  purchasePrice: number;
  investmentGain: number;
  monthlyLoss: number;
  yieldPct: number;
}

interface HeadCell {
  id: keyof EnrichedRow;
  label: string;
  align?: 'left' | 'right' | 'center' | 'justify';
}

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

export default function CashflowList() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const cashflows = useCashflowStore((s) => s.cashflows);
  const removeCashflow = useCashflowStore((s) => s.removeCashflow);
  const objects = useInvestStore((s) => s.objects);
  const realEstates = useInvestStore((s) => s.realEstates);
  const credits = useCreditStore((s) => s.credits);

  const allInvestments = React.useMemo(() => [...objects, ...realEstates], [objects, realEstates]);

  const [openDialog, setOpenDialog] = React.useState(false);
  const [editItem, setEditItem] = React.useState<Cashflow | null>(null);
  const [snack, setSnack] = React.useState<{ open: boolean; msg: string }>({
    open: false,
    msg: '',
  });
  const [undoCtx, setUndoCtx] = React.useState<{ item: Cashflow; index: number } | null>(null);

  const [order, setOrder] = React.useState<Order>('asc');
  const [orderBy, setOrderBy] = React.useState<keyof EnrichedRow>('name');

  const existingNames = React.useMemo(() => cashflows.map((cf) => cf.name), [cashflows]);

  const headCells: readonly HeadCell[] = React.useMemo(
    () => [
      { id: 'name', label: t('cashflowList.estimationName') },
      { id: 'investmentName', label: t('cashflowList.investment') },
      { id: 'creditName', label: t('cashflowList.credit') },
      { id: 'cashflowMonthly', label: t('cashflowList.netProfitMonthly'), align: 'right' },
      { id: 'yieldPct', label: t('cashflowList.yield'), align: 'right' },
      { id: 'purchasePrice', label: t('cashflowList.purchasePrice'), align: 'right' },
      { id: 'investmentGain', label: t('cashflowList.investmentGain'), align: 'right' },
      { id: 'monthlyLoss', label: t('cashflowList.monthlyLoss'), align: 'right' },
    ],
    [t],
  );

  const handleRequestSort = (property: keyof EnrichedRow) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const rows = React.useMemo(() => {
    const enriched: EnrichedRow[] = cashflows.map((cf) => {
      const investment = allInvestments.find((i) => i.id === cf.investmentId);
      const credit = cf.creditId ? credits.find((c) => c.id === cf.creditId) : null;
      const monthlyLoss = credit ? parseFloat(credit.totalMonthly || '0') : 0;
      const purchasePrice = parseFloat(investment?.totalPrice || investment?.startAmount || '0');
      const cashflowMonthlyNum = parseFloat(cf.cashflowMonthly);
      const yieldPct = purchasePrice > 0 ? ((cashflowMonthlyNum * 12) / purchasePrice) * 100 : 0;

      return {
        ...cf,
        investmentName: investment?.name || '—',
        creditName: credit?.name || '—',
        purchasePrice,
        investmentGain: parseFloat(investment?.netGainMonthly || '0'),
        monthlyLoss,
        yieldPct,
      };
    });
    return enriched.sort(getComparator(order, orderBy));
  }, [cashflows, allInvestments, credits, order, orderBy]);

  const handleOpenEdit = (item: Cashflow) => {
    setEditItem(item);
    setOpenDialog(true);
  };
  const handleOpenAdd = () => {
    setEditItem(null);
    setOpenDialog(true);
  };
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditItem(null);
  };
  const handleDelete = (id: string) => {
    const index = cashflows.findIndex((c) => c.id === id);
    if (index === -1) return;
    const item = cashflows[index];
    removeCashflow(id);
    setUndoCtx({ item, index });
    setSnack({ open: true, msg: t('cashflowList.estimationDeleted') });
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
    setSnack({ open: false, msg: '' });
    setTimeout(() => setSnack({ open: true, msg: t('cashflowList.undone') }), 100);
  };

  return (
    <>
      {isMobile ? (
        // --- MOBILE VIEW ---
        <Box sx={{ pb: 10 }}>
          {rows.map((row) => (
            <Paper key={row.id} sx={{ p: 2, mb: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  mb: 1,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600, flex: 1, mr: 1 }}>
                  {row.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton color="primary" size="small" onClick={() => handleOpenEdit(row)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton color="error" size="small" onClick={() => handleDelete(row.id)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
              <Stack spacing={1}>
                <ResultRow label={t('cashflowList.investment')} value={row.investmentName} />
                <ResultRow
                  label={t('cashflowList.netProfitMonthly')}
                  value={`${fmtMoney(String(row.cashflowMonthly))} €`}
                />
                <ResultRow label={t('cashflowList.credit')} value={row.creditName} />
              </Stack>
            </Paper>
          ))}
          {rows.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">{t('cashflowList.noEstimations')}</Typography>
            </Paper>
          )}
        </Box>
      ) : (
        // --- DESKTOP VIEW ---
        <TableContainer component={Paper} sx={{ width: '100%' }}>
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell style={{ width: 100 }}>{t('cashflowList.actions')}</TableCell>
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
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title={t('cashflowList.edit')}>
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => handleOpenEdit(row)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('cashflowList.delete')}>
                        <IconButton color="error" size="small" onClick={() => handleDelete(row.id)}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{row.name}</TableCell>
                  <TableCell>{row.investmentName}</TableCell>
                  <TableCell>{row.creditName}</TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color: parseFloat(row.cashflowMonthly) < 0 ? 'error.main' : 'success.main',
                    }}
                  >
                    {fmtMoney(String(row.cashflowMonthly))} €
                  </TableCell>
                  <TableCell align="right">{fmtMoney(String(row.yieldPct))} %</TableCell>
                  <TableCell align="right">{fmtMoney(String(row.purchasePrice))} €</TableCell>
                  <TableCell align="right" sx={{ color: 'success.main' }}>
                    {fmtMoney(String(row.investmentGain))} €
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'error.main' }}>
                    {fmtMoney(String(row.monthlyLoss))} €
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} sx={{ textAlign: 'center', color: '#94a3b8', py: 3 }}>
                    {t('cashflowList.noEstimations')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* SHARED COMPONENTS */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', right: 24, bottom: 24 }}
        onClick={handleOpenAdd}
      >
        <AddIcon />
      </Fab>
      {openDialog && (
        <CashflowDialog
          onClose={handleCloseDialog}
          editItem={editItem}
          existingNames={existingNames.filter((n) => n !== editItem?.name)}
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
              {t('cashflowList.undo')}
            </Button>
          ) : null
        }
      />
    </>
  );
}
