import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  useTheme,
} from '@mui/material';
import RealEstateForm from './RealEstateForm';
import ObjectForm from './ObjectForm';

export default function CreateInvestmentDialog({
  onClose,
  existingNames,
  editItem,
}: {
  onClose: () => void;
  existingNames: string[];
  editItem?: { id: string; kind: 'OBJECT' | 'REAL_ESTATE' } | null;
}) {
  const [tab, setTab] = React.useState<'REAL_ESTATE' | 'OBJECT'>(editItem?.kind || 'REAL_ESTATE');
  const formRef = React.useRef<{ submit: () => void; isValid: () => boolean }>(null);
  const theme = useTheme();
  const [isValid, setIsValid] = React.useState(false);
  const handleTabChange = (_: any, v: 'REAL_ESTATE' | 'OBJECT') => {
    if (!editItem) {
      setTab(v);
    }
  };
  // Poll for validation state
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (formRef.current?.isValid) {
        setIsValid(formRef.current.isValid());
      }
    }, 100);
    return () => clearInterval(interval);
  }, [tab]);

  const handleCreate = () => {
    if (formRef.current) {
      formRef.current.submit();
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      sx={{
        [theme.breakpoints.down('sm')]: {
          '& .MuiDialog-paper': {
            margin: 0,
            maxHeight: '100%',
            borderRadius: 0,
          },
        },
      }}
    >
      <DialogTitle>{editItem ? 'investment bearbeiten' : 'investment hinzufügen'}</DialogTitle>
      <Tabs
        value={tab}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="REAL_ESTATE" label="Immobilie" disabled={!!editItem} />
        <Tab value="OBJECT" label="Objekt" disabled={!!editItem} />
      </Tabs>

      <DialogContent dividers sx={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
        {tab === 'REAL_ESTATE' && (
          <RealEstateForm
            ref={formRef}
            onClose={onClose}
            existingNames={existingNames}
            editId={editItem?.kind === 'REAL_ESTATE' ? editItem.id : undefined}
          />
        )}
        {tab === 'OBJECT' && (
          <ObjectForm
            ref={formRef}
            onClose={onClose}
            existingNames={existingNames}
            editId={editItem?.kind === 'OBJECT' ? editItem.id : undefined}
          />
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button variant="contained" onClick={handleCreate} disabled={!isValid}>
          {editItem ? 'Speichern' : 'Erstellen'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
