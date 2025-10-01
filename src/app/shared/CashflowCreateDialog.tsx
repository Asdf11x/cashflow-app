import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Autocomplete,
  Typography,
} from '@mui/material';
import { useInvestStore } from '../../core/state/useInvestStore';
import { useCreditStore } from '../../core/state/useCreditStore';
import { useCashflowStore } from '../../core/state/useCashflowStore';
import { computeCashflowMonthly, fmtMoney } from '../../core/domain/calc';

type Option = { id: string; label: string };

export default function CashflowCreateDialog({ onClose }: { onClose: () => void }) {
  const investments = useInvestStore((s) => s.objects);
  const credits = useCreditStore((s) => s.credits);
  const addCashflow = useCashflowStore((s) => s.addCashflow);

  const [name, setName] = React.useState('Cashflow A');
  const invOptions: Option[] = investments.map((i) => ({
    id: i.id,
    label: `${i.id.slice(0, 6)}, ${i.name}`,
  }));
  const crdOptions: Option[] = credits.map((c) => ({
    id: c.id,
    label: `${c.id.slice(0, 6)}, ${c.name}`,
  }));

  const [inv, setInv] = React.useState<Option | null>(null);
  const [crd, setCrd] = React.useState<Option | null>(null);

  const cashflowPreview = React.useMemo(() => {
    if (!inv || !crd) return null;
    const i = investments.find((x) => x.id === inv.id)!;
    const c = credits.find((x) => x.id === crd.id)!;
    return computeCashflowMonthly(i, c);
  }, [inv, crd, investments, credits]);

  const create = () => {
    if (!inv || !crd) return;
    addCashflow(name, inv.id, crd.id);
    onClose();
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Cashflow anlegen</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <Autocomplete
            options={invOptions}
            getOptionLabel={(o) => o.label}
            onChange={(_, v) => setInv(v)}
            renderInput={(p) => <TextField {...p} label="Investment auswählen" />}
          />
          <Autocomplete
            options={crdOptions}
            getOptionLabel={(o) => o.label}
            onChange={(_, v) => setCrd(v)}
            renderInput={(p) => <TextField {...p} label="Kredit auswählen" />}
          />

          {cashflowPreview && (
            <Typography sx={{ mt: 1 }}>
              <b>Cashflow/Monat:</b> {fmtMoney(cashflowPreview)} €
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button variant="contained" disabled={!inv || !crd} onClick={create}>
          Erstellen
        </Button>
      </DialogActions>
    </Dialog>
  );
}
