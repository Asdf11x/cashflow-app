import * as React from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  TextField,
  type SelectChangeEvent,
} from '@mui/material';

export function ResultRow({
  label,
  value,
  isBold = false,
}: {
  label: string;
  value: string;
  isBold?: boolean;
}) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography fontWeight={isBold ? 700 : 400}>{label}</Typography>
      <Typography fontWeight={isBold ? 700 : 400}>{value}</Typography>
    </Box>
  );
}

interface CurrencySelectProps {
  value: string;
  onChange: (event: SelectChangeEvent<string>) => void;
  disabled?: boolean;
}

export function CurrencySelect({ value, onChange, disabled }: CurrencySelectProps) {
  return (
    <Select value={value} onChange={onChange} sx={{ minWidth: 100 }} disabled={disabled}>
      <MenuItem value="EUR">€ EUR</MenuItem>
      <MenuItem value="CHF">CHF</MenuItem>
      <MenuItem value="CZK">Kč CZK</MenuItem>
    </Select>
  );
}

interface PriceInputProps {
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  error: boolean;
  helperText: string;
}

export function PriceInput({ label, value, onChange, onBlur, error, helperText }: PriceInputProps) {
  return (
    <TextField
      label={label}
      type="text"
      inputProps={{
        inputMode: 'decimal',
        pattern: '[0-9]*[.,]?[0-9]*',
      }}
      value={value}
      onChange={onChange}
      onBlur={onBlur} // Added onBlur
      error={error}
      helperText={helperText}
      fullWidth
      required
    />
  );
}
