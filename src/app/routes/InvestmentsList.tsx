// src/components/InvestmentsList.tsx
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
  Box,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import { useInvestStore } from '../../core/state/useInvestStore';
import { fmtMoney, fmtNumberTrim } from '../../core/domain/calc';
import CreateInvestmentDialog from '../shared/investment/CreateInvestmentDialog.tsx';
import type { ObjectInvestment, RealEstateInvestment } from '../../core/domain/types.ts';

type Row = {
  id: string;
  name: string;
  purchasePrice: string;
  netGainMonthly: string;
  yieldPctYearly: string;
  kind: 'OBJECT' | 'REAL_ESTATE';
};

export default function InvestmentsList() {
  const objects = useInvestStore((s) => s.objects);
  const realEstates = useInvestStore((s) => s.realEstates);
  const removeObject = useInvestStore((s) => s.removeObject);
  const removeRealEstate = useInvestStore((s) => s.removeRealEstate);

  const [openAdd, setOpenAdd] = React.useState(false);
  const [editItem, setEditItem] = React.useState<{
    id: string;
    kind: 'OBJECT' | 'REAL_ESTATE';
  } | null>(null);
  const [snack, setSnack] = React.useState<{ open: boolean; msg: string }>({
    open: false,
    msg: '',
  });
  const existingNames = React.useMemo(
    () => [...objects.map((o) => o.name), ...realEstates.map((r) => r.name)],
    [objects, realEstates],
  );
  const [undoCtx, setUndoCtx] = React.useState<{
    item: ObjectInvestment | RealEstateInvestment;
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
        yieldPctYearly: fmtNumberTrim(o.returnPercent),
        kind: 'OBJECT' as const,
      })),
      ...realEstates.map((r) => ({
        id: r.id,
        name: r.name,
        // --- FIX: Use totalPrice for Real Estate to show the grand total ---
        purchasePrice: fmtMoney(r.totalPrice),
        // --------------------------------------------------------------------
        netGainMonthly: fmtMoney(r.netGainMonthly),
        yieldPctYearly: fmtNumberTrim(r.returnPercent),
        kind: 'REAL_ESTATE' as const,
      })),
    ],
    [objects, realEstates],
  );

  // delete a row and capture undo info
  const handleDelete = (row: Row, visibleIndex: number) => {
    // compute the index within the *same* subset (OBJECT or REAL_ESTATE) at delete time
    const subsetIndex = rows.slice(0, visibleIndex).filter((r) => r.kind === row.kind).length;
    const originalItem =
      row.kind === 'OBJECT'
        ? objects.find((o) => o.id === row.id)
        : realEstates.find((r) => r.id === row.id);

    if (!originalItem) return; // Should not happen

    if (row.kind === 'OBJECT') {
      removeObject(row.id);
    } else {
      removeRealEstate(row.id);
    }

    setUndoCtx({ item: originalItem, subsetIndex });
    setSnack({ open: true, msg: 'investment gelöscht' });
  };

  // undo reinserts into the proper collection at the original subset index
  const handleUndo = () => {
    if (!undoCtx) return;
    const { item, subsetIndex } = undoCtx;

    useInvestStore.setState((s) => {
      if (item.kind === 'OBJECT') {
        const before = s.objects.slice(0, subsetIndex);
        const after = s.objects.slice(subsetIndex);
        return {
          objects: [...before, item, ...after],
        };
      } else {
        const before = s.realEstates.slice(0, subsetIndex);
        const after = s.realEstates.slice(subsetIndex);
        return {
          realEstates: [...before, item, ...after],
        };
      }
    });

    setUndoCtx(null);
    setSnack({ open: false, msg: '' }); // close old snack before showing new
    setTimeout(() => setSnack({ open: true, msg: 'Rückgängig gemacht' }), 100);
  };

  return (
    <>
      <TableContainer component={Paper} sx={{ width: '100%' }}>
        <Table size="medium" sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow>
              <TableCell width={100}>Aktionen</TableCell>
              <TableCell>Name</TableCell>
              <TableCell align="right">Gesamtpreis</TableCell>
              <TableCell align="right">Monatl. Gewinn</TableCell>
              <TableCell align="right">Rendite p.a.</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, idx) => (
              <TableRow key={`${r.kind}:${r.id}`} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Bearbeiten">
                      <IconButton
                        color="primary"
                        size="small"
                        onClick={() => setEditItem({ id: r.id, kind: r.kind })}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Löschen">
                      <IconButton color="error" size="small" onClick={() => handleDelete(r, idx)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell align="right">{r.purchasePrice}</TableCell>
                <TableCell align="right">{r.netGainMonthly}</TableCell>
                <TableCell align="right">{r.yieldPctYearly} %</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: 'center', color: '#94a3b8', py: 3 }}>
                  Noch keine Investments. Klicke unten rechts auf „+".
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

      {openAdd && (
        <CreateInvestmentDialog onClose={() => setOpenAdd(false)} existingNames={existingNames} />
      )}
      {editItem && (
        <CreateInvestmentDialog
          onClose={() => setEditItem(null)}
          existingNames={existingNames.filter((n) => {
            // Exclude current item's name from uniqueness check
            if (editItem.kind === 'OBJECT') {
              const obj = objects.find((o) => o.id === editItem.id);
              return obj ? n !== obj.name : true;
            } else {
              const re = realEstates.find((r) => r.id === editItem.id);
              return re ? n !== re.name : true;
            }
          })}
          editItem={editItem}
        />
      )}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => {
          setSnack({ open: false, msg: '' });
          setUndoCtx(null); // Clear undo context if snackbar closes
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
