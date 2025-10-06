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
  useMediaQuery,
  useTheme,
  Typography,
  Chip,
  Link, // --- NEW: Import Link component for clickable names ---
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import { useInvestStore } from '../../core/state/useInvestStore';
import { fmtMoney, fmtNumberTrim } from '../../core/domain/calc';
import CreateInvestmentDialog from '../shared/investment/CreateInvestmentDialog.tsx';
import type { ObjectInvestment, RealEstateInvestment } from '../../core/domain/types.ts';

// --- UPDATED: Row type now includes link and currency ---
type Row = {
  id: string;
  name: string;
  purchasePrice: string;
  netGainMonthly: string;
  yieldPctYearly: string;
  kind: 'OBJECT' | 'REAL_ESTATE';
  link?: string;
  currency: string;
};

// --- NEW: Helper component to render name as a link if available ---
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
    subsetIndex: number;
  } | null>(null);

  const rows: Row[] = React.useMemo(
    () => [
      ...objects.map((o) => ({
        id: o.id,
        name: o.name,
        link: o.link,
        purchasePrice: fmtMoney(o.purchasePrice),
        netGainMonthly: fmtMoney(o.netGainMonthly),
        yieldPctYearly: fmtNumberTrim(o.returnPercent),
        kind: 'OBJECT' as const,
        currency: o.currency,
      })),
      ...realEstates.map((r) => ({
        id: r.id,
        name: r.name,
        link: r.link,
        purchasePrice: fmtMoney(r.totalPrice),
        netGainMonthly: fmtMoney(r.netGainMonthly),
        yieldPctYearly: fmtNumberTrim(r.returnPercent),
        kind: 'REAL_ESTATE' as const,
        currency: r.currency,
      })),
    ],
    [objects, realEstates],
  );

  const handleDelete = (row: Row, visibleIndex: number) => {
    const subsetIndex = rows.slice(0, visibleIndex).filter((r) => r.kind === row.kind).length;
    const originalItem =
      row.kind === 'OBJECT'
        ? objects.find((o) => o.id === row.id)
        : realEstates.find((r) => r.id === row.id);

    if (!originalItem) return;

    if (row.kind === 'OBJECT') {
      removeObject(row.id);
    } else {
      removeRealEstate(row.id);
    }

    setUndoCtx({ item: originalItem, subsetIndex });
    setSnack({ open: true, msg: 'Investment gelöscht' });
  };

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
    setSnack({ open: false, msg: '' });
    setTimeout(() => setSnack({ open: true, msg: 'Rückgängig gemacht' }), 100);
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
                    {/* --- UPDATED: Use NameCell component --- */}
                    <NameCell name={r.name} link={r.link} />
                  </Typography>
                  <Chip
                    label={r.kind === 'OBJECT' ? 'Objekt' : 'Immobilie'}
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
                    Gesamtpreis:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {/* --- UPDATED: Added currency --- */}
                    {r.purchasePrice} {r.currency}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary" variant="body2">
                    Monatl. Gewinn:
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="success.main">
                    {/* --- UPDATED: Added currency --- */}
                    {r.netGainMonthly} {r.currency}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary" variant="body2">
                    Rendite p.a.:
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
              <Typography color="text.secondary">
                Noch keine Investments. Klicke unten rechts auf „+".
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

        {openAdd && (
          <CreateInvestmentDialog onClose={() => setOpenAdd(false)} existingNames={existingNames} />
        )}
        {editItem && (
          <CreateInvestmentDialog
            onClose={() => setEditItem(null)}
            existingNames={existingNames.filter((n) => {
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
                <TableCell>
                  {/* --- UPDATED: Use NameCell component --- */}
                  <NameCell name={r.name} link={r.link} />
                </TableCell>
                {/* --- UPDATED: Added currency --- */}
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
                  Noch keine Investments. Klicke unten rechts auf „+".
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
