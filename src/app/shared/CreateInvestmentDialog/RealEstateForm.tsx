import * as React from 'react';
import {
  TextField,
  Box,
  Stack,
  Typography,
  InputAdornment,
  Divider,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { D, normalize, sanitizeDecimal, cfgToPctStr, pctToFrac } from './formHelpers';
import { ResultRow, CurrencySelect, PriceInput } from './SharedComponents';
import { fmtMoney } from '../../../core/domain/calc';
import { getDefaultCostsConfig } from '../../../config';
import Decimal from 'decimal.js';
import type { CostItemState, CostState } from './formHelpers';

// --- NEW ---
// New type for a cost item that has a primary value and a secondary (deductible) value
interface SplitCostItemState {
  enabled: boolean;
  value1: string; // e.g., total Hausgeld
  value2: string; // e.g., apportionable part
  mode: 'currency' | 'percent';
  allowModeChange: boolean;
  label1: string;
  label2: string;
}
// --- END NEW ---

interface CostInputRowProps {
  item: CostItemState;
  onItemChange: (newItem: Partial<CostItemState>) => void;
  baseAmount: Decimal;
  currency: string;
}

function CostInputRow({ item, onItemChange, baseAmount, currency }: CostInputRowProps) {
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
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
      <Checkbox checked={enabled} onChange={(e) => onItemChange({ enabled: e.target.checked })} />
      <TextField
        label={label}
        value={value}
        onChange={(e) => onItemChange({ value: sanitizeDecimal(e.target.value) })}
        disabled={!enabled}
        type="text"
        inputMode="decimal"
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
                    (= {fmtMoney(absoluteAmount.toString())})
                  </Typography>
                )}
              </Stack>
            </InputAdornment>
          ),
        }}
      />
      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={handleToggleMode}
        size="small"
        disabled={!enabled || !allowModeChange}
      >
        <ToggleButton value="currency">{currency}</ToggleButton>
        <ToggleButton value="percent">%</ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}

// --- NEW ---
// A special input row for split costs like Hausgeld / umlagefähiger Anteil
interface SplitCostInputRowProps {
  item: SplitCostItemState;
  onItemChange: (newItem: Partial<SplitCostItemState>) => void;
  baseAmount: Decimal; // NOTE: For running costs, this is usually MONTHLY rent
  currency: string;
}

function SplitCostInputRow({ item, onItemChange, baseAmount, currency }: SplitCostInputRowProps) {
  const { enabled, value1, value2, mode, allowModeChange, label1, label2 } = item;
  const isPercent = mode === 'percent';

  const handleToggleMode = () => {
    const newMode = mode === 'percent' ? 'currency' : 'percent';
    let nextValue1 = '0';
    let nextValue2 = '0';

    if (newMode === 'percent') {
      // from currency to percent
      nextValue1 = baseAmount.gt(0)
        ? D(normalize(value1)).div(baseAmount).mul(100).toDP(2).toString()
        : '0';
      nextValue2 = baseAmount.gt(0)
        ? D(normalize(value2)).div(baseAmount).mul(100).toDP(2).toString()
        : '0';
    } else {
      // from percent to currency
      nextValue1 = baseAmount.mul(pctToFrac(value1)).toDP(0).toString();
      nextValue2 = baseAmount.mul(pctToFrac(value2)).toDP(0).toString();
    }
    onItemChange({ mode: newMode, value1: nextValue1, value2: nextValue2 });
  };

  const absoluteNet = React.useMemo(() => {
    const val1 = isPercent ? baseAmount.mul(pctToFrac(value1)) : D(normalize(value1));
    const val2 = isPercent ? baseAmount.mul(pctToFrac(value2)) : D(normalize(value2));
    return val1.sub(val2);
  }, [value1, value2, mode, baseAmount, isPercent]);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
      <Checkbox checked={enabled} onChange={(e) => onItemChange({ enabled: e.target.checked })} />

      <Stack sx={{ flexGrow: 1 }} direction="row" alignItems="center">
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: { xs: 'column', sm: 'row' } }}>
          <TextField
            label={label1}
            value={value1}
            onChange={(e) => onItemChange({ value1: sanitizeDecimal(e.target.value) })}
            disabled={!enabled}
            type="text"
            inputMode="decimal"
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
            inputMode="decimal"
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
        <Stack spacing={0.5} alignItems="center" sx={{ ml: 1.5, minWidth: '80px' }}>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={handleToggleMode}
            size="small"
            disabled={!enabled || !allowModeChange}
          >
            <ToggleButton value="currency">{currency}</ToggleButton>
            <ToggleButton value="percent">%</ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            netto: {fmtMoney(absoluteNet.toString())}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
// --- END NEW ---

interface CostSectionAccordionProps {
  title: string;
  costs: CostState;
  onCostChange: (key: string, newValues: Partial<CostItemState>) => void;
  baseAmount: Decimal;
  currency: string;
  total: Decimal;
}

function CostSectionAccordion({
  title,
  costs,
  onCostChange,
  baseAmount,
  currency,
  total,
}: CostSectionAccordionProps) {
  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 2 }}>
          <Typography fontWeight={700}>{title}</Typography>
          <Typography color="text.secondary">Kosten: {fmtMoney(total.toString())}</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          {Object.entries(costs).map(([key, item]) => (
            <CostInputRow
              key={key}
              item={item}
              onItemChange={(newValues) => onCostChange(key, newValues)}
              baseAmount={baseAmount}
              currency={currency}
            />
          ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

function DetailsAccordion() {
  // ... (Your exact DetailsAccordion implementation)
  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography fontWeight={700}>Objektdetails (optional)</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography color="text.secondary">
          Hier können Details wie Wohnfläche, Grundstücksgröße etc. erfasst werden.
        </Typography>
      </AccordionDetails>
    </Accordion>
  );
}

const RealEstateForm = React.forwardRef(({ onClose }: { onClose: () => void }, ref) => {
  const cfg = getDefaultCostsConfig();
  const [rName, setRName] = React.useState('Immobilie A');
  const [rPurchasePrice, setRPurchasePrice] = React.useState('350000');
  const [rCurrency, setRCurrency] = React.useState('€');
  const [rMonthlyColdRent, setRMonthlyColdRent] = React.useState('1200');
  const [purchaseCosts, setPurchaseCosts] = React.useState<CostState>({
    brokerCommission: {
      enabled: true,
      value: cfgToPctStr(cfg.purchaseCosts.basicCosts.brokerCommission.rateOfPurchasePrice),
      mode: 'percent',
      allowModeChange: false,
      label: 'Maklerprovision',
    },
    propertyTransferTax: {
      enabled: true,
      value: cfgToPctStr(cfg.purchaseCosts.basicCosts.propertyTransferTax.rateOfPurchasePrice),
      mode: 'percent',
      allowModeChange: false,
      label: 'Grunderwerbsteuer',
    },
    notaryFees: {
      enabled: true,
      value: cfgToPctStr(cfg.purchaseCosts.basicCosts.notaryFees.rateOfPurchasePrice),
      mode: 'percent',
      allowModeChange: false,
      label: 'Notarkosten',
    },
    landRegistryFees: {
      enabled: true,
      value: cfgToPctStr(cfg.purchaseCosts.basicCosts.landRegistryFees.rateOfPurchasePrice),
      mode: 'percent',
      allowModeChange: false,
      label: 'Grundbucheintrag',
    },
  });
  const [additionalCosts, setAdditionalCosts] = React.useState<CostState>({
    renovationCosts: {
      enabled: false,
      value: '0',
      mode: 'currency',
      allowModeChange: true,
      label: 'Renovierungskosten',
    },
    subvention: {
      enabled: false,
      value: '0',
      mode: 'currency',
      allowModeChange: true,
      label: 'Subvention (z.B. Förderung)',
    },
    otherAdditionalCosts: {
      enabled: false,
      value: '0',
      mode: 'percent',
      allowModeChange: true,
      label: 'Zusätzliche Kosten',
    },
    appraisalFee: {
      enabled: false,
      value: cfgToPctStr(cfg.purchaseCosts.additionalCosts.appraisalFee.rateOfPurchasePrice),
      mode: 'percent',
      allowModeChange: true,
      label: 'Gutachterkosten',
    },
    insuranceSetup: {
      enabled: false,
      value: cfgToPctStr(cfg.purchaseCosts.additionalCosts.insuranceSetup.rateOfPurchasePrice),
      mode: 'percent',
      allowModeChange: true,
      label: 'Versicherungs-Setup',
    },
  });
  const [taxDeductions, setTaxDeductions] = React.useState<CostState>({
    incomeTax: {
      enabled: true,
      value: cfgToPctStr(cfg.rent.taxes.incomeTax.rate),
      mode: 'percent',
      allowModeChange: false,
      label: 'Einkommensteuer',
    },
    solidaritySurcharge: {
      enabled: true,
      value: cfgToPctStr(cfg.rent.taxes.solidaritySurcharge.rate),
      mode: 'percent',
      allowModeChange: false,
      label: 'Solidaritätszuschlag',
    },
    churchTax: {
      enabled: false,
      value: cfgToPctStr(cfg.rent.taxes.churchTax.rate),
      mode: 'percent',
      allowModeChange: false,
      label: 'Kirchensteuer',
    },
    otherDeductions: {
      enabled: false,
      value: '0',
      mode: 'currency',
      allowModeChange: true,
      label: 'Zusätzliche Abzüge',
    },
  });
  // --- NEW ---
  const [runningCosts, setRunningCosts] = React.useState({
    hausgeld: {
      enabled: false,
      value1: '0', // total
      value2: '0', // apportionable
      mode: 'currency',
      allowModeChange: true,
      label1: 'Hausgeld',
      label2: 'davon umlagefähig',
    } as SplitCostItemState,
  });
  // --- END NEW ---

  const [isPriceTouched, setIsPriceTouched] = React.useState(false);
  const rPurchasePriceD = D(normalize(rPurchasePrice));
  const rMonthlyColdRentD = D(normalize(rMonthlyColdRent)); // MODIFIED: Renamed for clarity
  const rAnnualColdRentD = rMonthlyColdRentD.mul(12);

  const handleCostChange =
    (setState: React.Dispatch<React.SetStateAction<CostState>>) =>
    (key: string, newValues: Partial<CostItemState>) => {
      setState((prev) => ({ ...prev, [key]: { ...prev[key], ...newValues } }));
    };
  // --- NEW ---
  const handleRunningCostsChange = (
    key: keyof typeof runningCosts,
    newValues: Partial<SplitCostItemState>,
  ) => {
    setRunningCosts((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...newValues },
    }));
  };
  // --- END NEW ---

  const calculateTotal = (
    costs: CostState,
    base: Decimal,
    specialHandlers: Record<string, 'subtract'> = {},
  ): Decimal => {
    return Object.entries(costs).reduce((sum, [key, item]) => {
      if (!item.enabled) return sum;

      const value =
        item.mode === 'percent' ? base.mul(pctToFrac(item.value)) : D(normalize(item.value));

      if (specialHandlers[key] === 'subtract') {
        return sum.sub(value);
      }
      return sum.add(value);
    }, new Decimal(0));
  };
  const purchaseCostsTotal = React.useMemo(
    () => calculateTotal(purchaseCosts, rPurchasePriceD),
    [purchaseCosts, rPurchasePriceD],
  );
  const additionalCostsTotal = React.useMemo(
    () => calculateTotal(additionalCosts, rPurchasePriceD, { subvention: 'subtract' }),
    [additionalCosts, rPurchasePriceD],
  );
  const deductionsTotalAnnual = React.useMemo(() => {
    const incomeTaxAmount = taxDeductions.incomeTax.enabled
      ? rAnnualColdRentD.mul(pctToFrac(taxDeductions.incomeTax.value))
      : D(0);
    const soliAmount = taxDeductions.solidaritySurcharge.enabled
      ? incomeTaxAmount.mul(pctToFrac(taxDeductions.solidaritySurcharge.value))
      : D(0);
    const churchTaxAmount = taxDeductions.churchTax.enabled
      ? incomeTaxAmount.mul(pctToFrac(taxDeductions.churchTax.value))
      : D(0);
    const annualTaxes = incomeTaxAmount.add(soliAmount).add(churchTaxAmount);
    const other = taxDeductions.otherDeductions;
    let otherDeductionsAnnual = D(0);
    if (other.enabled) {
      if (other.mode === 'currency') {
        otherDeductionsAnnual = D(normalize(other.value)).mul(12);
      } else {
        otherDeductionsAnnual = rAnnualColdRentD.mul(pctToFrac(other.value));
      }
    }
    return annualTaxes.add(otherDeductionsAnnual);
  }, [taxDeductions, rAnnualColdRentD]);

  // --- NEW ---
  const runningCostsTotalMonthly = React.useMemo(() => {
    let total = D(0);
    const item = runningCosts.hausgeld;
    if (item.enabled) {
      const base = rMonthlyColdRentD; // Base for percent is monthly rent
      const val1 =
        item.mode === 'percent' ? base.mul(pctToFrac(item.value1)) : D(normalize(item.value1));
      const val2 =
        item.mode === 'percent' ? base.mul(pctToFrac(item.value2)) : D(normalize(item.value2));
      total = total.add(val1.sub(val2));
    }
    return total;
  }, [runningCosts, rMonthlyColdRentD]);

  const runningCostsTotalAnnual = runningCostsTotalMonthly.mul(12);
  // --- END NEW ---

  const totalPurchaseSideCosts = purchaseCostsTotal.add(additionalCostsTotal);
  const grandTotalPrice = rPurchasePriceD.add(totalPurchaseSideCosts);
  const netRentAnnual = rAnnualColdRentD.sub(deductionsTotalAnnual).sub(runningCostsTotalAnnual); // MODIFIED
  const netRentMonthly = netRentAnnual.div(12);
  const yieldPct = grandTotalPrice.gt(0)
    ? netRentAnnual.div(grandTotalPrice).mul(100).toDP(2).toString()
    : '0';
  const purchasePriceError = rPurchasePriceD.lte(0);

  React.useImperativeHandle(ref, () => ({
    submit: () => {
      if (purchasePriceError) {
        setIsPriceTouched(true);
        console.error('Cannot create real estate with invalid purchase price.');
        return;
      }
      console.log('Creating Real Estate:', {
        name: rName,
      });
      onClose();
    },
  }));

  return (
    <Stack spacing={3} sx={{ mt: 1 }}>
      <TextField label="Name" value={rName} onChange={(e) => setRName(e.target.value)} fullWidth />
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <PriceInput
          label="Kaufpreis"
          value={rPurchasePrice}
          onChange={(e) => setRPurchasePrice(sanitizeDecimal(e.target.value))}
          onBlur={() => setIsPriceTouched(true)}
          error={isPriceTouched && purchasePriceError}
          helperText={isPriceTouched && purchasePriceError ? 'Kaufpreis muss > 0 sein' : ' '}
        />
        <CurrencySelect value={rCurrency} onChange={(e) => setRCurrency(e.target.value)} />
      </Box>
      <DetailsAccordion />
      <CostSectionAccordion
        title="Kaufnebenkosten"
        costs={purchaseCosts}
        onCostChange={handleCostChange(setPurchaseCosts)}
        baseAmount={rPurchasePriceD}
        currency={rCurrency}
        total={purchaseCostsTotal}
      />
      <CostSectionAccordion
        title="Zusätzliche Kaufnebenkosten"
        costs={additionalCosts}
        onCostChange={handleCostChange(setAdditionalCosts)}
        baseAmount={rPurchasePriceD}
        currency={rCurrency}
        total={additionalCostsTotal}
      />
      <Divider />
      <TextField
        label="Monatliche Kaltmiete"
        type="text"
        inputMode="decimal"
        value={rMonthlyColdRent}
        onChange={(e) => setRMonthlyColdRent(sanitizeDecimal(e.target.value))}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  (jährlich: {fmtMoney(rAnnualColdRentD.toString())})
                </Typography>
                <Typography>{rCurrency}</Typography>
              </Stack>
            </InputAdornment>
          ),
        }}
        fullWidth
      />
      <CostSectionAccordion
        title="Steuerliche Abzüge"
        costs={taxDeductions}
        onCostChange={handleCostChange(setTaxDeductions)}
        baseAmount={rAnnualColdRentD}
        currency={rCurrency}
        total={deductionsTotalAnnual.div(12)}
      />
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 2 }}>
            <Typography fontWeight={700}>Laufende Kosten</Typography>
            <Typography color="text.secondary">
              Kosten: {fmtMoney(runningCostsTotalMonthly.toString())}
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <SplitCostInputRow
              item={runningCosts.hausgeld}
              onItemChange={(newValues) => handleRunningCostsChange('hausgeld', newValues)}
              baseAmount={rMonthlyColdRentD}
              currency={rCurrency}
            />
          </Stack>
        </AccordionDetails>
      </Accordion>
      <Stack
        spacing={1}
        sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
      >
        <Typography variant="h6">Zusammenfassung</Typography>
        <ResultRow
          label="Gesamtkosten (Neben- & Zusatzkosten)"
          value={fmtMoney(totalPurchaseSideCosts.toString())}
        />
        <ResultRow
          label="Gesamtpreis (inkl. Kaufpreis)"
          value={fmtMoney(grandTotalPrice.toString())}
          isBold
        />
        <Divider sx={{ my: 1 }} />
        {/* --- NEW --- */}
        <ResultRow
          label="Jährliche laufende Kosten"
          value={fmtMoney(runningCostsTotalAnnual.toString())}
        />
        {/* --- END NEW --- */}
        <ResultRow
          label="Monatliche Nettomiete (nach Abzügen & Kosten)" // MODIFIED
          value={fmtMoney(netRentMonthly.toString())}
        />
        <ResultRow
          label="Jährliche Nettomiete (nach Abzügen & Kosten)" // MODIFIED
          value={fmtMoney(netRentAnnual.toString())}
        />
        <ResultRow label="Anfangsrendite p.a." value={`${yieldPct} %`} isBold />
      </Stack>
    </Stack>
  );
});

export default RealEstateForm;
