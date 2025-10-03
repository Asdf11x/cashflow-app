// --- START OF FILE SharedComponents.tsx ---

import * as React from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  TextField,
  type SelectChangeEvent,
} from '@mui/material';

// ... (ResultRow remains the same) ...
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

// --- ADDED TYPES HERE ---
interface CurrencySelectProps {
  value: string;
  onChange: (event: SelectChangeEvent<string>) => void;
}

export function CurrencySelect({ value, onChange }: CurrencySelectProps) {
  return (
    <Select value={value} onChange={onChange} sx={{ minWidth: 100 }}>
      <MenuItem value="€">€ EUR</MenuItem>
      <MenuItem value="CHF">CHF</MenuItem>
      <MenuItem value="CZK">CZK</MenuItem>
    </Select>
  );
}

// --- ADDED TYPES HERE ---
interface PriceInputProps {
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void; // Added onBlur for the next step
  error: boolean;
  helperText: string;
}

export function PriceInput({
  label,
  value,
  onChange,
  onBlur, // Added onBlur
  error,
  helperText,
}: PriceInputProps) {
  return (
    <TextField
      label={label}
      type="text"
      inputMode="decimal"
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
