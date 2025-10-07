import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import CreditForm from './CreditForm.tsx';
import type { Credit } from '../../../core/domain/types.ts';

type Props = {
  onClose: () => void;
  editItem?: Credit | null;
  existingNames: string[];
};
type FormHandle = { submit: () => void; isValid: () => boolean };

export default function CreditCreateDialog({ onClose, editItem, existingNames }: Props) {
  const formRef = React.useRef<FormHandle>(null);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [isValid, setIsValid] = React.useState(false);

  React.useEffect(() => {
    const interval = setInterval(() => {
      if (formRef.current?.isValid) {
        setIsValid(formRef.current.isValid());
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const handleSave = () => {
    formRef.current?.submit();
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
      <DialogTitle>{editItem ? 'Kredit bearbeiten' : 'Kredit anlegen'}</DialogTitle>
      <DialogContent>
        <CreditForm
          ref={formRef}
          onClose={onClose}
          editId={editItem?.id}
          existingNames={existingNames}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button variant="contained" onClick={handleSave} disabled={!isValid}>
          {editItem ? 'Speichern' : 'Erstellen'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
