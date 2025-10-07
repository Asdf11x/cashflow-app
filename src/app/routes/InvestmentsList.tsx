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
  Link,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import { useInvestStore } from '../../core/state/useInvestStore';
import { fmtMoney, fmtNumberTrim } from '../../core/domain/calc';
import CreateInvestmentDialog from '../shared/investment/CreateInvestmentDialog.tsx';
import type {
  ObjectInvestment,
  RealEstateInvestment,
  Depositvestment,
} from '../../core/domain/types.ts';

type Row = {
  id: string;
  name: string;
  purchasePrice: string;
  netGainMonthly: string;
  yieldPctYearly: string;
  kind: 'OBJECT' | 'REAL_ESTATE' | 'FIXED_TERM_DEPOSIT';
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

  const rows: Row[] = React.useMemo(
    () => [
      ...objects.map((o) => ({
        id: o.id,
        name: o.name,
        link: o.link,
        purchasePrice: fmtMoney(o.startAmount),
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
      ...deposits.map((d) => ({
        id: d.id,
        name: d.name,
        link: d.link,
        purchasePrice: fmtMoney(d.startAmount),
        netGainMonthly: fmtMoney(d.netGainMonthly),
        yieldPctYearly: fmtNumberTrim(d.returnPercent),
        kind: 'FIXED_TERM_DEPOSIT' as const,
        currency: d.currency,
      })),
    ],
    [objects, realEstates, deposits],
  );

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
      setSnack({ open: true, msg: 'Investment gelöscht' });
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
    setTimeout(() => setSnack({ open: true, msg: 'Rückgängig gemacht' }), 100);
  };

  const getKindLabel = (kind: Row['kind']) => {
    switch (kind) {
      case 'OBJECT':
        return 'Objekt';
      case 'REAL_ESTATE':
        return 'Immobilie';
      case 'FIXED_TERM_DEPOSIT':
        return 'Festgeld';
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
                    Anlagebetrag:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {r.purchasePrice} {r.currency}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary" variant="body2">
                    Monatl. Gewinn:
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="success.main">
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
              <TableCell align="right">Anlagebetrag</TableCell>
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
              Rückgängig
            </Button>
          ) : null
        }
      />
    </>
  );
}
