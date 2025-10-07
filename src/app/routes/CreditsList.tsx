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
  useMediaQuery,
  useTheme,
  Box,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import { useCreditStore } from '../../core/state/useCreditStore';
import { fmtMoney } from '../../core/domain/calc';
import CreditCreateDialog from '../shared/credit/CreditCreateDialog.tsx';
import type { Credit } from '../../core/domain/types.ts';

export default function CreditsList() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const credits = useCreditStore((s) => s.credits);
  const removeCredit = useCreditStore((s) => s.removeCredit);

  const [openAdd, setOpenAdd] = React.useState(false);
  const [editItem, setEditItem] = React.useState<Credit | null>(null);
  const [snack, setSnack] = React.useState<{ open: boolean; msg: string }>({
    open: false,
    msg: '',
  });
  const [undoCtx, setUndoCtx] = React.useState<{ item: Credit; index: number } | null>(null);

  const existingNames = React.useMemo(() => credits.map((c) => c.name), [credits]);

  const handleOpenEdit = (credit: Credit) => {
    setEditItem(credit);
  };

  const handleCloseDialog = () => {
    setOpenAdd(false);
    setEditItem(null);
  };

  const handleDelete = (id: string) => {
    const index = credits.findIndex((c) => c.id === id);
    const item = credits[index];
    if (!item) return;

    removeCredit(id);
    setUndoCtx({ item, index });
    setSnack({ open: true, msg: 'Kredit gelöscht' });
  };

  const handleUndo = () => {
    if (!undoCtx) return;
    const { item, index } = undoCtx;
    useCreditStore.setState((s) => {
      const newCredits = [...s.credits];
      newCredits.splice(index, 0, item);
      return { credits: newCredits };
    });
    setUndoCtx(null);
    setSnack({ open: false, msg: '' });
    setTimeout(() => setSnack({ open: true, msg: 'Rückgängig gemacht' }), 100);
  };

  // Mobile card view
  if (isMobile) {
    return (
      <>
        <Box sx={{ pb: 10 }}>
          {credits.map((c) => (
            <Paper key={c.id} sx={{ p: 2, mb: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  mb: 1,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                  {c.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton color="primary" size="small" onClick={() => handleOpenEdit(c)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton color="error" size="small" onClick={() => handleDelete(c.id)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
              <Box sx={{ display: 'grid', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary" variant="body2">
                    Kredithöhe:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {fmtMoney(c.principal)} €
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary" variant="body2">
                    Monatl. Rate:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {fmtMoney(c.totalMonthly || '0')} €
                  </Typography>
                </Box>
              </Box>
            </Paper>
          ))}
          {credits.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                Noch keine Kredite. Rechts unten „+" klicken.
              </Typography>
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

        {(openAdd || editItem) && (
          <CreditCreateDialog
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
                Rückgängig
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
              <TableCell width={100}>Aktionen</TableCell>
              <TableCell>Name</TableCell>
              <TableCell align="right">Kredithöhe</TableCell>
              <TableCell align="right">Monatliche Rate</TableCell>
              <TableCell align="right">Sollzins p.a.</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {credits.map((c) => (
              <TableRow key={c.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Bearbeiten">
                      <IconButton color="primary" size="small" onClick={() => handleOpenEdit(c)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Löschen">
                      <IconButton color="error" size="small" onClick={() => handleDelete(c.id)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell align="right">{fmtMoney(c.principal)} €</TableCell>
                <TableCell align="right">{fmtMoney(c.totalMonthly || '0')} €</TableCell>
                <TableCell align="right">{c.rateAnnualPct} %</TableCell>
              </TableRow>
            ))}
            {credits.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: 'center', color: '#94a3b8', py: 3 }}>
                  Noch keine Kredite. Klicken Sie unten rechts auf „+", um einen zu erstellen.
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

      {(openAdd || editItem) && (
        <CreditCreateDialog
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
              Rückgängig
            </Button>
          ) : null
        }
      />
    </>
  );
}
