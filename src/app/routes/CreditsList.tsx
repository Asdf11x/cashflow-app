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
import { useCreditStore } from '../../core/state/useCreditStore';
import { fmtMoney } from '../../core/domain/calc';
import CreditCreateDialog from '../shared/credit/CreditCreateDialog.tsx';

export default function CreditsList() {
  const credits = useCreditStore((s) => s.credits);
  const removeCredit = useCreditStore((s) => s.removeCredit);

  const [openAdd, setOpenAdd] = React.useState(false);
  const [snack, setSnack] = React.useState<{ open: boolean; msg: string }>({
    open: false,
    msg: '',
  });
  const [undoCtx, setUndoCtx] = React.useState<{ item: any; index: number } | null>(null);

  const handleDelete = (id: string) => {
    const index = credits.findIndex((c) => c.id === id);
    const item = credits[index];
    removeCredit(id);
    setUndoCtx({ item, index });
    setSnack({ open: true, msg: 'Kredit gelöscht' });
  };

  const handleUndo = () => {
    if (!undoCtx) return;
    const { item, index } = undoCtx;
    useCreditStore.setState((s) => ({
      credits: [...s.credits.slice(0, index), item, ...s.credits.slice(index)],
    }));
    setUndoCtx(null);
    setSnack({ open: true, msg: 'Rückgängig gemacht' });
  };

  return (
    <>
      <TableContainer component={Paper} sx={{ width: '100%' }}>
        <Table size="medium" sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell align="right">Kredithöhe</TableCell>
              <TableCell align="right">Tilgung / Monat</TableCell>
              <TableCell align="right" width={64} />
            </TableRow>
          </TableHead>
          <TableBody>
            {credits.map((c) => (
              <TableRow key={c.id} hover>
                <TableCell>{c.name}</TableCell>
                <TableCell align="right">{fmtMoney(c.principal)} €</TableCell>
                <TableCell align="right">{fmtMoney(c.amortMonthly)} €</TableCell>
                <TableCell align="right">
                  <Tooltip title="Löschen">
                    <IconButton color="error" size="small" onClick={() => handleDelete(c.id)}>
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {credits.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} sx={{ color: '#94a3b8' }}>
                  Noch keine Kredite. Rechts unten „+“ klicken.
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

      {openAdd && <CreditCreateDialog onClose={() => setOpenAdd(false)} />}

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack({ open: false, msg: '' })}
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
