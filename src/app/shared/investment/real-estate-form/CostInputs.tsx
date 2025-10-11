import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  TextField,
  Box,
  Stack,
  Typography,
  InputAdornment,
  Checkbox,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import Decimal from 'decimal.js';
import { D, normalize, sanitizeDecimal, pctToFrac } from '../formHelpers';
import type { CostItemState } from '../formHelpers';
import { fmtMoney } from '../../../../core/domain/calc';

// --- Reusable Split Cost Item State ---
export interface SplitCostItemState {
  enabled: boolean;
  value1: string; // Total House Fee
  value2: string; // Apportionable Part
  mode: 'currency' | 'percent';
  allowModeChange: boolean;
  label1: string;
  label2: string;
}

// --- Cost Input Row Component ---
interface CostInputRowProps {
  item: CostItemState;
  onItemChange: (newItem: Partial<CostItemState>) => void;
  baseAmount: Decimal;
  currency: string;
}

export function CostInputRow({ item, onItemChange, baseAmount, currency }: CostInputRowProps) {
  const { t } = useTranslation();
  const { enabled, value, mode, allowModeChange, label } = item;
  const absoluteAmount = React.useMemo(
    () => (mode === 'percent' ? baseAmount.mul(pctToFrac(value)) : D(normalize(value))),
    [value, mode, baseAmount],
  );

  const handleToggleMode = () => {
    const newMode = mode === 'percent' ? 'currency' : 'percent';
    const currentValue = absoluteAmount;
    let nextValue = '0';
    if (newMode === 'percent') {
      nextValue = baseAmount.gt(0) ? currentValue.div(baseAmount).mul(100).toDP(2).toString() : '0';
    } else {
      nextValue = currentValue.toDP(0).toString();
    }
    onItemChange({ mode: newMode, value: nextValue });
  };

  const isPercent = mode === 'percent';
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        width: '100%',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1.5, flexGrow: 1 }}>
        <Checkbox checked={enabled} onChange={(e) => onItemChange({ enabled: e.target.checked })} />
        <TextField
          label={label}
          value={value}
          onChange={(e) => onItemChange({ value: sanitizeDecimal(e.target.value) })}
          disabled={!enabled}
          type="text"
          inputProps={{ inputMode: 'decimal' }}
          fullWidth
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" color={enabled ? 'text.primary' : 'text.disabled'}>
                    {isPercent ? '%' : currency}
                  </Typography>
                  {isPercent && (
                    <Typography variant="caption" color="text.secondary">
                      {t('realEstateForm.inParentheses', {
                        value: fmtMoney(absoluteAmount.toString()),
                      })}
                    </Typography>
                  )}
                </Stack>
              </InputAdornment>
            ),
          }}
        />
      </Box>
      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={handleToggleMode}
        size="small"
        disabled={!enabled || !allowModeChange}
        sx={{ width: { xs: '100%', sm: 'auto' } }}
      >
        <ToggleButton value="currency" sx={{ width: '50%' }}>
          {currency}
        </ToggleButton>
        <ToggleButton value="percent" sx={{ width: '50%' }}>
          %
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}

// --- Split Cost Input Row Component ---
interface SplitCostInputRowProps {
  item: SplitCostItemState;
  onItemChange: (newItem: Partial<SplitCostItemState>) => void;
  baseAmount: Decimal; // Monthly Cold Rent (Base for value1)
  currency: string;
}

export function SplitCostInputRow({
  item,
  onItemChange,
  baseAmount, // Monthly Cold Rent (Base for value1: Total House Fee)
  currency,
}: SplitCostInputRowProps) {
  const { t } = useTranslation();
  const { enabled, value1, value2, mode, allowModeChange, label1, label2 } = item;
  const isPercent = mode === 'percent';

  // 1. Calculate the Monthly House Fee Sum (This is the new base for the split logic)
  const monthlyHouseFeeSum = React.useMemo(() => {
    // value1 (Total House Fee) is relative to baseAmount (Monthly Rent)
    return isPercent ? baseAmount.mul(pctToFrac(value1)) : D(normalize(value1));
  }, [value1, isPercent, baseAmount]);

  const handleToggleMode = () => {
    const newMode = mode === 'percent' ? 'currency' : 'percent';
    let nextValue1 = '0';
    let nextValue2 = '0';

    // Base for value1 (Total House Fee) conversion is baseAmount (Rent)
    const base1 = baseAmount;
    // Base for value2 (Apportionable Part) conversion is monthlyHouseFeeSum
    const base2 = monthlyHouseFeeSum;

    if (newMode === 'percent') {
      // value1: currency -> percent (of Rent)
      nextValue1 = base1.gt(0) ? D(normalize(value1)).div(base1).mul(100).toDP(2).toString() : '0';
      // value2: currency -> percent (of House Fee Sum)
      nextValue2 = base2.gt(0) ? D(normalize(value2)).div(base2).mul(100).toDP(2).toString() : '0';
    } else {
      // value1: percent -> currency (absolute amount)
      nextValue1 = base1.mul(pctToFrac(value1)).toDP(0).toString();
      // value2: percent -> currency (absolute amount)
      nextValue2 = base2.mul(pctToFrac(value2)).toDP(0).toString();
    }
    onItemChange({ mode: newMode, value1: nextValue1, value2: nextValue2 });
  };

  const absoluteNet = React.useMemo(() => {
    // val1 is the total House Fee amount (monthlyHouseFeeSum)
    const val1 = monthlyHouseFeeSum;

    // val2Absolute is the absolute apportionable amount
    let val2Absolute: Decimal;
    if (isPercent) {
      // value2 is a percentage of the total house fee (val1)
      val2Absolute = val1.mul(pctToFrac(value2));
    } else {
      // value2 is an absolute currency amount
      val2Absolute = D(normalize(value2));
    }

    // Net (Non-Apportionable Part) = Total House Fee (val1) - Apportionable Part (val2Absolute)
    return val1.sub(val2Absolute);
  }, [value2, mode, monthlyHouseFeeSum, isPercent]);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
      <Checkbox checked={enabled} onChange={(e) => onItemChange({ enabled: e.target.checked })} />
      <Stack
        sx={{
          flexGrow: 1,
          width: '100%',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { sm: 'center' },
        }}
      >
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: { xs: 'column', sm: 'row' } }}>
          <TextField
            label={label1}
            value={value1}
            onChange={(e) => onItemChange({ value1: sanitizeDecimal(e.target.value) })}
            disabled={!enabled}
            type="text"
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="body2" color={enabled ? 'text.primary' : 'text.disabled'}>
                    {isPercent ? '%' : currency}
                  </Typography>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderTopRightRadius: { sm: 0 },
                borderBottomRightRadius: { sm: 0 },
              },
            }}
          />
          <TextField
            label={label2}
            value={value2}
            onChange={(e) => onItemChange({ value2: sanitizeDecimal(e.target.value) })}
            disabled={!enabled}
            type="text"
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="body2" color={enabled ? 'text.primary' : 'text.disabled'}>
                    {isPercent ? '%' : currency}
                  </Typography>
                </InputAdornment>
              ),
            }}
            sx={{
              marginTop: { xs: 2, sm: 0 },
              '& .MuiOutlinedInput-root': {
                borderTopLeftRadius: { sm: 0 },
                borderBottomLeftRadius: { sm: 0 },
                marginLeft: { sm: '-1px' },
              },
            }}
          />
        </Box>
        <Stack
          spacing={0.5}
          alignItems="center"
          sx={{
            ml: { sm: 1.5 },
            mt: { xs: 2, sm: 0 },
            width: { xs: '100%', sm: 'auto' },
            minWidth: { sm: '80px' },
          }}
        >
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={handleToggleMode}
            size="small"
            disabled={!enabled || !allowModeChange}
            fullWidth
          >
            <ToggleButton value="currency">{currency}</ToggleButton>
            <ToggleButton value="percent">%</ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            {t('realEstateForm.net')} {fmtMoney(absoluteNet.toString())} {currency}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
