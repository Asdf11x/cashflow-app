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
import CreateInvestmentDialog from '../shared/CreateInvestmentDialog.tsx';

type Row = {
  id: string;
  name: string;
  purchasePrice: string;
  netGainMonthly: string;
  yieldPctYearly: string;
  kind: 'OBJECT' | 'REAL_ESTATE';
};

export default function InvestmentsList() {
  // state selectors (hooks must be INSIDE the component)
  const objects = useInvestStore((s) => s.objects);
  const realEstates = useInvestStore((s) => s.realEstates);
  const removeObject = useInvestStore((s) => s.removeObject);
  const removeRealEstate = useInvestStore((s) => s.removeRealEstate);

  const [openAdd, setOpenAdd] = React.useState(false);
  const [snack, setSnack] = React.useState<{ open: boolean; msg: string }>({
    open: false,
    msg: '',
  });
  const [undoCtx, setUndoCtx] = React.useState<{
    row: Row;
    subsetIndex: number; // index within its own collection at delete time
  } | null>(null);

  // merge into single list for the table
  const rows: Row[] = React.useMemo(
    () => [
      ...objects.map((o) => ({
        id: o.id,
        name: o.name,
        purchasePrice: fmtMoney(o.purchasePrice),
        netGainMonthly: fmtMoney(o.netGainMonthly),
        yieldPctYearly: `${fmtNumberTrim(o.yieldPctYearly)} %`,
        kind: 'OBJECT' as const,
      })),
      ...realEstates.map((r) => ({
        id: r.id,
        name: r.name,
        purchasePrice: fmtMoney(r.purchasePrice),
        netGainMonthly: fmtMoney(r.netGainMonthly),
        yieldPctYearly: `${fmtNumberTrim(r.yieldPctYearly)} %`,
        kind: 'REAL_ESTATE' as const,
      })),
    ],
    [objects, realEstates],
  );

  // delete a row and capture undo info
  const handleDelete = (row: Row, visibleIndex: number) => {
    // compute the index within the *same* subset (OBJECT or REAL_ESTATE) at delete time
    const subsetIndex = rows.slice(0, visibleIndex).filter((r) => r.kind === row.kind).length;

    if (row.kind === 'OBJECT') {
      removeObject(row.id);
    } else {
      removeRealEstate(row.id);
    }

    setUndoCtx({ row, subsetIndex });
    setSnack({ open: true, msg: 'Investment gelöscht' });
  };

  // undo reinserts into the proper collection at the original subset index
  const handleUndo = () => {
    if (!undoCtx) return;
    const { row, subsetIndex } = undoCtx;

    useInvestStore.setState((s) => {
      if (row.kind === 'OBJECT') {
        const before = s.objects.slice(0, subsetIndex);
        const after = s.objects.slice(subsetIndex);
        return {
          objects: [
            ...before,
            {
              ...row,
              // if your store keeps additional fields, spread them here or
              // reconstruct as needed
            } as any,
            ...after,
          ],
        };
      } else {
        const before = s.realEstates.slice(0, subsetIndex);
        const after = s.realEstates.slice(subsetIndex);
        return {
          realEstates: [
            ...before,
            {
              ...row,
            } as any,
            ...after,
          ],
        };
      }
    });

    setUndoCtx(null);
    setSnack({ open: true, msg: 'Rückgängig gemacht' });
  };

  const isEmpty = rows.length === 0;

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
            {rows.map((r, idx) => (
              <TableRow key={`${r.kind}:${r.id}`} hover>
                <TableCell>
                  {r.name}
                  {/* optional badge to distinguish types */}
                  {/* <span style={{ marginLeft: 8, color: '#64748b', fontSize: 12 }}>
                    {r.kind === 'OBJECT' ? 'Objekt' : 'Immobilie'}
                  </span> */}
                </TableCell>
                <TableCell align="right">{r.purchasePrice}</TableCell>
                <TableCell align="right">{r.netGainMonthly}</TableCell>
                <TableCell align="right">{r.yieldPctYearly} %</TableCell>
                <TableCell align="right">
                  <Tooltip title="Löschen">
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(r, idx)}
                      size="small"
                      aria-label={`Lösche ${r.name}`}
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}

            {isEmpty && (
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

      {/* Dialog */}
      {openAdd && <CreateInvestmentDialog onClose={() => setOpenAdd(false)} />}

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
