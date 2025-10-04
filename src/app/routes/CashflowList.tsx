import * as React from 'react';
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useCashflowStore } from '../../core/state/useCashflowStore';
import { useInvestStore } from '../../core/state/useInvestStore';
import { useCreditStore } from '../../core/state/useCreditStore';
import { fmtMoney } from '../../core/domain/calc';
import CashflowCreateDialog from '../shared/CashflowCreateDialog';
import type { Cashflow } from '../../core/state/useCashflowStore';

export default function CashflowList() {
  const cashflows = useCashflowStore((s) => s.cashflows);
  const removeCashflow = useCashflowStore((s) => s.removeCashflow);
  // --- FIX 1: Select state slices individually to prevent infinite loops ---
  const objects = useInvestStore((s) => s.objects);
  const realEstates = useInvestStore((s) => s.realEstates);
  // --------------------------------------------------------------------------
  const credits = useCreditStore((s) => s.credits);

  const allInvestments = React.useMemo(() => [...objects, ...realEstates], [objects, realEstates]);

  const [openAdd, setOpenAdd] = React.useState(false);
  const [snack, setSnack] = React.useState<{ open: boolean; msg: string }>({
    open: false,
    msg: '',
  });
  const [undoCtx, setUndoCtx] = React.useState<{ item: Cashflow; index: number } | null>(null);

  const nameById = <T extends { id: string; name: string }>(list: T[], id: string) =>
    list.find((x) => x.id === id)?.name ?? '—';

  const handleDelete = (id: string) => {
    const index = cashflows.findIndex((c) => c.id === id);
    if (index === -1) return;
    const item = cashflows[index];
    removeCashflow(id);
    setUndoCtx({ item, index });
    setSnack({ open: true, msg: 'Cashflow gelöscht' });
  };

  const handleUndo = () => {
    if (!undoCtx) return;
    const { item, index } = undoCtx;
    useCashflowStore.setState((s) => ({
      cashflows: [...s.cashflows.slice(0, index), item, ...s.cashflows.slice(index)],
    }));
    setUndoCtx(null);
    setSnack({ open: false, msg: '' });
    setTimeout(() => setSnack({ open: true, msg: 'Rückgängig gemacht' }), 100);
  };

  return (
    <>
      {/* --- FIX 2: Correct the component prop typo --- */}
      <TableContainer component={Paper} sx={{ width: '100%' }}>
        {/* ------------------------------------------- */}
        <Table size="medium" sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell align="right">Cashflow / Monat</TableCell>
              <TableCell>Investment</TableCell>
              <TableCell>Kredit</TableCell>
              <TableCell align="right" width={64} />
            </TableRow>
          </TableHead>
          <TableBody>
            {cashflows.map((cf) => (
              <TableRow key={cf.id} hover>
                <TableCell>{cf.name}</TableCell>
                <TableCell
                  align="right"
                  sx={{ color: cf.cashflowMonthly.startsWith('-') ? 'error.main' : 'success.main' }}
                >
                  {fmtMoney(cf.cashflowMonthly)}
                </TableCell>
                <TableCell>{nameById(allInvestments, cf.investmentId)}</TableCell>
                <TableCell>{nameById(credits, cf.creditId)}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Löschen">
                    <IconButton color="error" size="small" onClick={() => handleDelete(cf.id)}>
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {cashflows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: 'center', color: '#94a3b8', py: 3 }}>
                  Noch keine Cashflows. Klicke unten rechts auf „+".
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

      {openAdd && <CashflowCreateDialog onClose={() => setOpenAdd(false)} />}

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
              Rückgängig
            </Button>
          ) : null
        }
      />
    </>
  );
}
