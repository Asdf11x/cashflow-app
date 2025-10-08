import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import CreditForm from './CreditForm';
import type { Credit } from '../../../core/domain/types';

type Props = {
  onClose: () => void;
  editItem?: Credit | null;
  existingNames: string[];
};
type FormHandle = { submit: () => void; isValid: () => boolean };

export default function CreditCreateDialog({ onClose, editItem, existingNames }: Props) {
  const { t } = useTranslation();
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
      <DialogTitle>{t(editItem ? 'creditDialog.editTitle' : 'creditDialog.createTitle')}</DialogTitle>
      <DialogContent>
        <CreditForm
          ref={formRef}
          onClose={onClose}
          editId={editItem?.id}
          existingNames={existingNames}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="contained" onClick={handleSave} disabled={!isValid}>
          {t(editItem ? 'common.save' : 'common.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}