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
  Box,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useInvestStore } from '../../core/state/useInvestStore';
import { fmtMoney } from '../../core/domain/calc';
import ObjectCreateSheet from '../shared/ObjectCreateSheet';
import { useSwipeable } from 'react-swipeable';

function SwipeableRow({ onDelete, children }: { onDelete: () => void; children: React.ReactNode }) {
  const [tx, setTx] = React.useState(0);
  const TH = 120;
  const handlers = useSwipeable({
    onSwiping: (e) => {
      const nx = Math.max(-160, Math.min(0, -e.deltaX)); // left only
      setTx(-nx);
    },
    onSwipedLeft: (e) => {
      if (e.absX > TH) onDelete();
      else setTx(0);
    },
    onSwipedRight: () => setTx(0),
    trackMouse: true,
  });

  return (
    <Box sx={{ position: 'relative', overflow: 'hidden' }} {...handlers}>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          pr: 2,
          bgcolor: '#fee2e2',
          color: '#b91c1c',
        }}
      >
        🗑
      </Box>
      <Box
        sx={{
          position: 'relative',
          transform: `translateX(${-tx}px)`,
          transition: 'transform .15s ease',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export default function InvestmentsList() {
  const objects = useInvestStore((s) => s.objects);
  const removeObject = useInvestStore((s) => s.removeObject);
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <TableContainer component={Paper}>
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell align="right">Kaufpreis</TableCell>
              <TableCell align="right">monatl. Gewinn</TableCell>
              <TableCell align="right">Rendite p.a.</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {objects.map((o) => (
              <TableRow
                key={o.id}
                hover
                sx={{ '& td': { borderBottom: '1px solid #e5e7eb' }, p: 0 }}
              >
                <TableCell colSpan={4} sx={{ p: 0 }}>
                  <SwipeableRow onDelete={() => removeObject(o.id)}>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 0.5fr 0.5fr 0.5fr',
                        alignItems: 'center',
                      }}
                    >
                      <Box sx={{ p: 1.5 }}>{o.name}</Box>
                      <Box sx={{ p: 1.5, textAlign: 'right' }}>{fmtMoney(o.purchasePrice)}</Box>
                      <Box sx={{ p: 1.5, textAlign: 'right' }}>{fmtMoney(o.netGainMonthly)}</Box>
                      <Box sx={{ p: 1.5, textAlign: 'right' }}>{o.yieldPctYearly} %</Box>
                    </Box>
                  </SwipeableRow>
                </TableCell>
              </TableRow>
            ))}
            {objects.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} sx={{ color: '#94a3b8' }}>
                  Noch keine Investments. Klicke unten rechts auf „+“.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Fab
        color="primary"
        sx={{ position: 'fixed', right: 24, bottom: 24 }}
        onClick={() => setOpen(true)}
      >
        <AddIcon />
      </Fab>

      {open && <ObjectCreateSheet onClose={() => setOpen(false)} />}
    </>
  );
}
