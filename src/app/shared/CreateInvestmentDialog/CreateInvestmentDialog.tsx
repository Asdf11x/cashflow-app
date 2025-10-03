// --- START OF FILE CreateInvestmentDialog.tsx ---

import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
} from '@mui/material';
import RealEstateForm from './RealEstateForm';
import ObjectForm from './ObjectForm';

export default function CreateInvestmentDialog({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = React.useState<'REAL_ESTATE' | 'OBJECT'>('REAL_ESTATE');

  // A ref to access the submit function of the active form component
  const formRef = React.useRef<{ submit: () => void }>(null);

  const handleCreate = () => {
    if (formRef.current) {
      formRef.current.submit();
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Investment hinzufügen</DialogTitle>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="fullWidth"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="REAL_ESTATE" label="Immobilie" />
        <Tab value="OBJECT" label="Objekt" />
      </Tabs>

      <DialogContent dividers sx={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
        {tab === 'REAL_ESTATE' && <RealEstateForm ref={formRef} onClose={onClose} />}
        {tab === 'OBJECT' && <ObjectForm ref={formRef} onClose={onClose} />}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button variant="contained" onClick={handleCreate}>
          Erstellen
        </Button>
      </DialogActions>
    </Dialog>
  );
}
