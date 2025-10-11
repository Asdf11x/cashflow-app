// src/components/shared/investment/real-estate-form/FormHeader.tsx

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  TextField,
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  type SelectChangeEvent,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { PriceInput, CurrencySelect } from '../../SharedComponents';

interface FormHeaderProps {
  name: string;
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNameBlur: () => void;
  isNameTouched: boolean;
  nameError: boolean;
  nameHelperText: string;
  purchasePrice: string;
  onPurchasePriceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPurchasePriceBlur: () => void;
  isPriceTouched: boolean;
  priceError: boolean;
  priceHelperText: string;
  currency: string;
  onCurrencyChange: (e: SelectChangeEvent) => void;
  link: string;
  onLinkChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isEditing?: boolean;
}

export default function FormHeader(props: FormHeaderProps) {
  const { t } = useTranslation();

  return (
    <>
      <TextField
        label={t('realEstateForm.nameLabel')}
        value={props.name}
        onChange={props.onNameChange}
        onBlur={props.onNameBlur}
        error={props.isNameTouched && props.nameError}
        helperText={props.isNameTouched ? props.nameHelperText : ' '}
        fullWidth
        required
      />
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <PriceInput
          label={t('realEstateForm.purchasePriceLabel')}
          value={props.purchasePrice}
          onChange={props.onPurchasePriceChange}
          onBlur={props.onPurchasePriceBlur}
          error={props.isPriceTouched && props.priceError}
          helperText={props.priceHelperText}
        />
        <CurrencySelect value={props.currency} onChange={props.onCurrencyChange} />
      </Box>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={700}>{t('realEstateForm.accordions.details')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TextField
            name="link"
            label={t('realEstateForm.details.link')}
            value={props.link}
            onChange={props.onLinkChange}
            fullWidth
          />
        </AccordionDetails>
      </Accordion>
    </>
  );
}
