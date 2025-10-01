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
import { useInvestStore } from '../../core/state/useInvestStore';
import { fmtMoney, fmtNumberTrim } from '../../core/domain/calc';
import ObjectCreateDialog from '../shared/ObjectCreateDialog';

export default function InvestmentsList() {
  const objects = useInvestStore((s) => s.objects);
  const removeObject = useInvestStore((s) => s.removeObject);

  const [openAdd, setOpenAdd] = React.useState(false);
  const [snack, setSnack] = React.useState<{ open: boolean; msg: string }>({
    open: false,
    msg: '',
  });
  const [undoCtx, setUndoCtx] = React.useState<{ item: any; index: number } | null>(null);

  const handleDelete = (id: string) => {
    const index = objects.findIndex((o) => o.id === id);
    const item = objects[index];
    removeObject(id); // delete immediately
    setUndoCtx({ item, index }); // keep for undo
    setSnack({ open: true, msg: 'Investment gelöscht' });
  };

  const handleUndo = () => {
    if (!undoCtx) return;
    // precise re-insert at original index
    const { item, index } = undoCtx;
    useInvestStore.setState((s) => ({
      objects: [...s.objects.slice(0, index), item, ...s.objects.slice(index)],
    }));
    setUndoCtx(null);
    setSnack({ open: true, msg: 'Rückgängig gemacht' });
  };

  return (
    <>
      <TableContainer component={Paper} sx={{ width: '100%' }}>
        <Table size="medium" sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell align="right">Kaufpreis</TableCell>
              <TableCell align="right">monatl. Gewinn</TableCell>
              <TableCell align="right">Rendite p.a.</TableCell>
              <TableCell align="right" width={64} />
            </TableRow>
          </TableHead>
          <TableBody>
            {objects.map((o) => (
              <TableRow key={o.id} hover>
                <TableCell>{o.name}</TableCell>
                <TableCell align="right">{fmtMoney(o.purchasePrice)}</TableCell>
                <TableCell align="right">{fmtMoney(o.netGainMonthly)}</TableCell>
                <TableCell align="right">{fmtNumberTrim(o.yieldPctYearly)} %</TableCell>
                <TableCell align="right">
                  <Tooltip title="Löschen">
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(o.id)}
                      size="small"
                      aria-label={`Lösche ${o.name}`}
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {objects.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} sx={{ color: '#94a3b8' }}>
                  Noch keine Investments. Klicke unten rechts auf „+“.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add FAB */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', right: 24, bottom: 24 }}
        onClick={() => setOpenAdd(true)}
      >
        <AddIcon />
      </Fab>

      {/* MUI Dialog */}
      {openAdd && <ObjectCreateDialog onClose={() => setOpenAdd(false)} />}

      {/* Snackbar with Undo */}
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
