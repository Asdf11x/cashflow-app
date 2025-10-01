import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Stack,
  Typography,
  InputAdornment,
} from '@mui/material';
import { useInvestStore } from '../../core/state/useInvestStore';
import type { Objectvestment } from '../../core/domain/types';
import {
  netMonthly,
  netYearly,
  yieldPctYearly,
  fmtMoney,
  fmtNumberTrim,
} from '../../core/domain/calc';

type Props = { onClose: () => void };

export default function ObjectCreateDialog({ onClose }: Props) {
  const addObjectRaw = useInvestStore((s) => s.addObjectRaw);

  // Inputs (strings to keep decimal.js happy; strip spaces)
  const [name, setName] = React.useState('Objekt A');
  const [purchasePrice, setPurchasePrice] = React.useState('100000');
  const [grossGainMonthly, setGrossGainMonthly] = React.useState('1200');
  const [costMonthly, setCostMonthly] = React.useState('300');

  const draft: Objectvestment = {
    id: crypto.randomUUID(),
    name,
    kind: 'OBJECT',
    purchasePrice,
    grossGainMonthly,
    costMonthly,
    netGainMonthly: '0',
    netGainYearly: '0',
    yieldPctYearly: '0',
  };

  const netM = netMonthly(draft);
  const netY = netYearly(draft);
  const yld = yieldPctYearly(draft);

  const create = () => {
    addObjectRaw({
      id: draft.id,
      name: draft.name,
      kind: 'OBJECT',
      purchasePrice,
      grossGainMonthly,
      costMonthly,
    });
    onClose();
  };

  // helper to keep only digits and comma/dot, but store dot-decimals
  const normalize = (v: string) => v.replace(/\s/g, '').replace(',', '.');

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Investment hinzufügen</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <TextField
            label="Kaufpreis"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(normalize(e.target.value))}
            InputProps={{ endAdornment: <InputAdornment position="end">€</InputAdornment> }}
            fullWidth
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField
              label="Gewinn / Monat"
              value={grossGainMonthly}
              onChange={(e) => setGrossGainMonthly(normalize(e.target.value))}
              InputProps={{ endAdornment: <InputAdornment position="end">€</InputAdornment> }}
              fullWidth
            />
            <TextField
              label="Kosten / Monat"
              value={costMonthly}
              onChange={(e) => setCostMonthly(normalize(e.target.value))}
              InputProps={{ endAdornment: <InputAdornment position="end">€</InputAdornment> }}
              fullWidth
            />
          </Box>

          <Box sx={{ mt: 1 }}>
            <Typography fontWeight={700}>Netto monatlich</Typography>
            <Typography>{fmtMoney(netM)} €</Typography>
            <Typography fontWeight={700} sx={{ mt: 1 }}>
              Netto jährlich
            </Typography>
            <Typography>{fmtMoney(netY)} €</Typography>
            <Typography fontWeight={700} sx={{ mt: 1 }}>
              Rendite p.a.
            </Typography>
            <Typography>{fmtNumberTrim(yld)} %</Typography>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button variant="contained" onClick={create}>
          Erstellen
        </Button>
      </DialogActions>
    </Dialog>
  );
}
