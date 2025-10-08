import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import RealEstateForm from './RealEstateForm';
import ObjectForm from './ObjectForm';
import DepositForm from './DepositForm';

export default function CreateInvestmentDialog({
  onClose,
  existingNames,
  editItem,
}: {
  onClose: () => void;
  existingNames: string[];
  editItem?: { id: string; kind: 'REAL_ESTATE' | 'FIXED_TERM_DEPOSIT' | 'OBJECT' } | null;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = React.useState<'REAL_ESTATE' | 'FIXED_TERM_DEPOSIT' | 'OBJECT'>(
    editItem?.kind || 'REAL_ESTATE',
  );
  const formRef = React.useRef<{ submit: () => void; isValid: () => boolean }>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isValid, setIsValid] = React.useState(false);

  const handleTabChange = (
    _: React.SyntheticEvent,
    v: 'REAL_ESTATE' | 'OBJECT' | 'FIXED_TERM_DEPOSIT',
  ) => {
    if (!editItem) {
      setTab(v);
    }
  };

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
      fullScreen={isMobile}
      disableScrollLock={true}
      keepMounted={false}
      sx={{
        '& .MuiDialog-paper': {
          margin: isMobile ? 0 : 2,
          maxHeight: isMobile ? '100%' : 'calc(100% - 64px)',
        },
      }}
    >
      <DialogTitle>
        {t(editItem ? 'investmentDialog.editTitle' : 'investmentDialog.createTitle')}
      </DialogTitle>
      <Tabs
        value={tab}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab
          value="REAL_ESTATE"
          label={t('investmentDialog.tabRealEstate')}
          disabled={!!editItem}
        />
        <Tab
          value="FIXED_TERM_DEPOSIT"
          label={t('investmentDialog.tabDeposit')}
          disabled={!!editItem}
        />
        <Tab value="OBJECT" label={t('investmentDialog.tabObject')} disabled={!!editItem} />
      </Tabs>

      <DialogContent
        dividers
        sx={{
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          pb: isMobile ? 10 : 2,
        }}
      >
        {tab === 'REAL_ESTATE' && (
          <RealEstateForm
            ref={formRef}
            onClose={onClose}
            existingNames={existingNames}
            editId={editItem?.kind === 'REAL_ESTATE' ? editItem.id : undefined}
          />
        )}
        {tab === 'FIXED_TERM_DEPOSIT' && (
          <DepositForm
            ref={formRef}
            onClose={onClose}
            existingNames={existingNames}
            editId={editItem?.kind === 'FIXED_TERM_DEPOSIT' ? editItem.id : undefined}
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

      <DialogActions
        sx={{ position: isMobile ? 'sticky' : 'relative', bottom: 0, bgcolor: 'background.paper' }}
      >
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="contained" onClick={handleCreate} disabled={!isValid}>
          {t(editItem ? 'common.save' : 'common.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
