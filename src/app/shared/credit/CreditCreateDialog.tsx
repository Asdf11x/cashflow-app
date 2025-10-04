// src/components/dialogs/CreditCreateDialog.tsx
import * as React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import CreditForm from './CreditForm.tsx';

type Props = { onClose: () => void };
type FormHandle = { submit: () => void };

export default function CreditCreateDialog({ onClose }: Props) {
  const formRef = React.useRef<FormHandle>(null);

  const handleCreate = () => {
    formRef.current?.submit();
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Kredit anlegen</DialogTitle>
      <DialogContent>
        {/* The form component now lives here */}
        <CreditForm ref={formRef} onClose={onClose} />
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
