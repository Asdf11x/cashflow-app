// PercentField.tsx
import * as React from 'react';
import Decimal from 'decimal.js';
import { TextField, InputAdornment } from '@mui/material';

type Props = {
  label: string;
  value: string; // keep as string in parent
  onChange: (s: string) => void;
  disabled?: boolean;
  endAdornment?: React.ReactNode; // e.g. "%", "€"
  maxDecimals?: number; // default 2
};

export default function PercentField({
  label,
  value,
  onChange,
  disabled,
  endAdornment = '%',
  maxDecimals = 2,
}: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // allow empty while typing; normalize comma to dot
    const raw = e.target.value.replace(/\s/g, '').replace(',', '.');
    // only allow digits + one dot
    if (/^\d*\.?\d*$/.test(raw) || raw === '') onChange(raw);
  };

  const handleBlur = () => {
    if (value === '' || value === '.') return onChange('');
    try {
      const d = new Decimal(value);
      // trim FP noise and clamp decimals
      onChange(
        d
          .toFixed(maxDecimals)
          .replace(/\.00$/, '')
          .replace(/(\.\d*?)0+$/, '$1'),
      );
    } catch {
      onChange(''); // invalid → reset
    }
  };

  return (
    <TextField
      label={label}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      // text instead of number → better selection/cursor/wheel behavior
      type="text"
      inputMode="decimal"
      // select all on focus for fast overwrite
      onFocus={(e) => e.target.select()}
      disabled={disabled}
      fullWidth
      InputProps={{
        endAdornment: <InputAdornment position="end">{endAdornment}</InputAdornment>,
        // prevent mouse-wheel changes on some browsers
        onWheel: (e) => (e.target as HTMLInputElement).blur(),
      }}
    />
  );
}
