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
import { useCreditStore } from '../../core/state/useCreditStore';
import type { Credit } from '../../core/domain/types';
import { creditInterestMonthly, creditInterestYearly, fmtMoney } from '../../core/domain/calc';

type Props = { onClose: () => void };

export default function CreditCreateDialog({ onClose }: Props) {
  const addCreditRaw = useCreditStore((s) => s.addCreditRaw);

  const [name, setName] = React.useState('Kredit A');
  const [principal, setPrincipal] = React.useState('200000');
  const [equity, setEquity] = React.useState('50000');
  const [rateAnnualPct, setRateAnnualPct] = React.useState('3.2');
  const [amortMonthly, setAmortMonthly] = React.useState('600');

  const draft: Credit = {
    id: crypto.randomUUID(),
    name,
    principal,
    equity,
    rateAnnualPct,
    amortMonthly,
    interestMonthly: '0',
    interestYearly: '0',
  };

  draft.interestMonthly = creditInterestMonthly(draft);
  draft.interestYearly = creditInterestYearly(draft);

  const normalize = (v: string) => v.replace(/\s/g, '').replace(',', '.');

  const create = () => {
    addCreditRaw({
      id: draft.id,
      name,
      principal,
      equity,
      rateAnnualPct,
      amortMonthly,
    });
    onClose();
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Kredit hinzufügen</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <TextField
            type="number"
            label="Kredithöhe"
            value={principal}
            onChange={(e) => setPrincipal(normalize(e.target.value))}
            InputProps={{ endAdornment: <InputAdornment position="end">€</InputAdornment> }}
            fullWidth
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField
              type="number"
              label="Eigenkapital"
              value={equity}
              onChange={(e) => setEquity(normalize(e.target.value))}
              InputProps={{ endAdornment: <InputAdornment position="end">€</InputAdornment> }}
              fullWidth
            />
            <TextField
              type="number"
              label="Zinssatz p.a."
              value={rateAnnualPct}
              onChange={(e) => setRateAnnualPct(normalize(e.target.value))}
              InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
              fullWidth
            />
          </Box>
          <TextField
            type="number"
            label="Tilgung / Monat"
            value={amortMonthly}
            onChange={(e) => setAmortMonthly(normalize(e.target.value))}
            InputProps={{ endAdornment: <InputAdornment position="end">€</InputAdornment> }}
            fullWidth
          />

          <Box sx={{ mt: 1 }}>
            <Typography fontWeight={700}>Zinsen</Typography>
            <Typography>monatlich: {fmtMoney(draft.interestMonthly)} €</Typography>
            <Typography>jährlich: {fmtMoney(draft.interestYearly)} €</Typography>

            <Typography fontWeight={700} sx={{ mt: 1 }}>
              Tilgung
            </Typography>
            <Typography>pro Monat: {fmtMoney(amortMonthly)} €</Typography>
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
