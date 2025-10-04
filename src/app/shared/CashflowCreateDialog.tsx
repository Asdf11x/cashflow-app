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
import type { ObjectInvestment, RealEstateInvestment } from '../../core/domain/types';
import type Decimal from 'decimal.js'; // Import Decimal type

type Option = { id: string; label: string };

export default function CashflowCreateDialog({ onClose }: { onClose: () => void }) {
  const objects = useInvestStore((s) => s.objects);
  const realEstates = useInvestStore((s) => s.realEstates);
  const credits = useCreditStore((s) => s.credits);
  const addCashflow = useCashflowStore((s) => s.addCashflow);

  const [name, setName] = React.useState('Neuer Cashflow');

  const allInvestments = React.useMemo(() => [...objects, ...realEstates], [objects, realEstates]);

  const invOptions: Option[] = React.useMemo(
    () =>
      allInvestments.map((i) => ({
        id: i.id,
        label: `${i.kind === 'OBJECT' ? 'Objekt' : 'Immobilie'}: ${i.name}`,
      })),
    // --- FIX: Corrected typo from allInvestaments to allInvestments ---
    [allInvestments],
  );

  const crdOptions: Option[] = React.useMemo(
    () =>
      credits.map((c) => ({
        id: c.id,
        label: `${c.id.slice(0, 6)}, ${c.name}`,
      })),
    [credits],
  );

  const [inv, setInv] = React.useState<Option | null>(null);
  const [crd, setCrd] = React.useState<Option | null>(null);

  const cashflowPreview: Decimal | null = React.useMemo(() => {
    if (!inv || !crd) return null;
    const i = allInvestments.find((x) => x.id === inv.id);
    const c = credits.find((x) => x.id === crd.id);

    if (!i || !c) return null;

    return computeCashflowMonthly(i as ObjectInvestment | RealEstateInvestment, c);
  }, [inv, crd, allInvestments, credits]);

  const create = () => {
    if (!inv || !crd || !name.trim()) return;
    addCashflow(name.trim(), inv.id, crd.id);
    onClose();
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Cashflow anlegen</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
          />
          <Autocomplete
            options={invOptions}
            value={inv}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            getOptionLabel={(o) => o.label}
            onChange={(_, v) => setInv(v)}
            renderInput={(p) => <TextField {...p} label="Investment auswählen" />}
          />
          <Autocomplete
            options={crdOptions}
            value={crd}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            getOptionLabel={(o) => o.label}
            onChange={(_, v) => setCrd(v)}
            renderInput={(p) => <TextField {...p} label="Kredit auswählen" />}
          />

          {cashflowPreview && (
            <Typography sx={{ pt: 1, fontWeight: 'bold' }}>
              Berechneter Cashflow / Monat:{' '}
              <span style={{ color: cashflowPreview.isNegative() ? '#d32f2f' : '#2e7d32' }}>
                {fmtMoney(cashflowPreview.toString())}
              </span>
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button variant="contained" disabled={!inv || !crd || !name.trim()} onClick={create}>
          Erstellen
        </Button>
      </DialogActions>
    </Dialog>
  );
}
