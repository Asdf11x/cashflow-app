// src/components/shared/investment/RealEstateForm.tsx
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
import { ResultRow, CurrencySelect, PriceInput } from '../SharedComponents.tsx';
import { fmtMoney } from '../../../core/domain/calc';
import { getDefaultCostsConfig } from '../../../config';
import Decimal from 'decimal.js';
import type { CostItemState, CostState } from './formHelpers';
import { useInvestStore } from '../../../core/state/useInvestStore.ts';
import type {
  RealEstateInvestment,
  PurchasePriceCosts,
  AdditionalPurchasePriceCosts,
  RunningCostsRent,
  AdditionalRunningCostsRent,
} from '../../../core/domain/types.ts';

interface SplitCostItemState {
  enabled: boolean;
  value1: string; // e.g., total Hausgeld
  value2: string; // e.g., apportionable part
  mode: 'currency' | 'percent';
  allowModeChange: boolean;
  label1: string;
  label2: string;
}

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
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        width: '100%',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
      }}
    >
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
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: { xs: 'none', sm: 'block' } }}
                  >
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
        <Stack
          spacing={0.5}
          alignItems="center"
          sx={{
            ml: { sm: 1.5 },
            mt: { xs: 2, sm: 0 }, // Add margin top on mobile
            width: { xs: '100%', sm: 'auto' }, // Take full width on mobile
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
            netto: {fmtMoney(absoluteNet.toString())}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

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
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 1 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            alignItems: 'center',
          }}
        >
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
  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} disabled={true}>
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

const RealEstateForm = React.forwardRef(
  (
    {
      onClose,
      existingNames,
      editId,
    }: { onClose: () => void; existingNames: string[]; editId?: string },
    ref,
  ) => {
    const { addRealEstate, updateRealEstate, realEstates } = useInvestStore.getState();

    const cfg = getDefaultCostsConfig();
    const [rName, setRName] = React.useState('');
    const [isNameTouched, setIsNameTouched] = React.useState(false);
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

    const [runningCostsSplit, setRunningCostsSplit] = React.useState({
      houseFee: {
        enabled: false,
        value1: '0',
        value2: '0',
        mode: 'currency',
        allowModeChange: true,
        label1: 'Hausgeld',
        label2: 'davon umlagefähig',
      } as SplitCostItemState,
    });

    const [otherRunningCosts, setOtherRunningCosts] = React.useState<CostState>({
      other: {
        enabled: false,
        value: '0',
        mode: 'currency',
        allowModeChange: true,
        label: 'Sonstiges',
      },
    });
    const [isPriceTouched, setIsPriceTouched] = React.useState(false);

    React.useEffect(() => {
      if (!editId) {
        setRName('Immobilie');
        return;
      }

      const existing = realEstates.find((r) => r.id === editId);
      if (!existing) return;

      const reconstructCostState = (
        initialState: CostState,
        storedData: Record<string, string>,
      ): CostState => {
        const newState = { ...initialState };
        for (const key in storedData) {
          if (key in newState) {
            const value = D(storedData[key]);
            if (value.gt(0)) {
              newState[key] = {
                ...newState[key],
                enabled: true,
                value: value.toFixed(0),
                mode: 'currency',
              };
            }
          }
        }
        return newState;
      };

      setRName(existing.name);
      setRCurrency(existing.currency);
      setRPurchasePrice(D(existing.purchasePrice).toFixed(0));
      setRMonthlyColdRent(D(existing.monthlyColdRent).toFixed(0));

      setPurchaseCosts(reconstructCostState(purchaseCosts, existing.purchaseCosts));
      setAdditionalCosts(reconstructCostState(additionalCosts, existing.additionalPurchaseCosts));

      const taxData = existing.runningCostsRent;
      setTaxDeductions({
        ...taxDeductions,
        incomeTax: { ...taxDeductions.incomeTax, enabled: D(taxData.incomeTax).gt(0) },
        solidaritySurcharge: {
          ...taxDeductions.solidaritySurcharge,
          enabled: D(taxData.solidaritySurcharge).gt(0),
        },
        // --- FIX: Safely handle optional churchTax ---
        churchTax: {
          ...taxDeductions.churchTax,
          enabled: D(taxData.churchTax ?? '0').gt(0),
        },
        // --- FIX: Safely handle optional otherDeductions ---
        otherDeductions: {
          ...taxDeductions.otherDeductions,
          enabled: D(taxData.otherDeductions ?? '0').gt(0),
          value: D(taxData.otherDeductions ?? '0').toFixed(0),
          mode: 'currency',
        },
      });

      const houseFeeValue = D(existing.additionalRunningCostsRent.houseFee);
      if (houseFeeValue.gt(0)) {
        setRunningCostsSplit((prev) => ({
          ...prev,
          houseFee: {
            ...prev.houseFee,
            enabled: true,
            value1: houseFeeValue.toFixed(0),
            value2: '0',
            mode: 'currency',
          },
        }));
      }
      const otherRunningValue = D(existing.additionalRunningCostsRent.other);
      if (otherRunningValue.gt(0)) {
        setOtherRunningCosts((prev) => ({
          ...prev,
          other: {
            ...prev.other,
            enabled: true,
            value: otherRunningValue.toFixed(0),
            mode: 'currency',
          },
        }));
      }
    }, [editId, realEstates]);

    const rPurchasePriceD = D(normalize(rPurchasePrice));
    const rMonthlyColdRentD = D(normalize(rMonthlyColdRent));
    const rAnnualColdRentD = rMonthlyColdRentD.mul(12);

    const handleCostChange =
      (setState: React.Dispatch<React.SetStateAction<CostState>>) =>
      (key: string, newValues: Partial<CostItemState>) => {
        setState((prev) => ({ ...prev, [key]: { ...prev[key], ...newValues } }));
      };

    const handleSplitCostChange = (
      key: keyof typeof runningCostsSplit,
      newValues: Partial<SplitCostItemState>,
    ) => {
      setRunningCostsSplit((prev) => ({
        ...prev,
        [key]: { ...prev[key], ...newValues },
      }));
    };

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

    const otherRunningCostsTotalMonthly = React.useMemo(
      () => calculateTotal(otherRunningCosts, rMonthlyColdRentD),
      [otherRunningCosts, rMonthlyColdRentD],
    );

    const runningCostsTotalMonthly = React.useMemo(() => {
      let total = D(0);

      const item = runningCostsSplit.houseFee;
      if (item.enabled) {
        const base = rMonthlyColdRentD;
        const val1 =
          item.mode === 'percent' ? base.mul(pctToFrac(item.value1)) : D(normalize(item.value1));
        const val2 =
          item.mode === 'percent' ? base.mul(pctToFrac(item.value2)) : D(normalize(item.value2));
        total = total.add(val1.sub(val2));
      }

      total = total.add(otherRunningCostsTotalMonthly);

      return total;
    }, [runningCostsSplit, rMonthlyColdRentD, otherRunningCostsTotalMonthly]);

    const runningCostsTotalAnnual = runningCostsTotalMonthly.mul(12);

    const totalPurchaseSideCosts = purchaseCostsTotal.add(additionalCostsTotal);
    const grandTotalPrice = rPurchasePriceD.add(totalPurchaseSideCosts);
    const netRentAnnual = rAnnualColdRentD.sub(deductionsTotalAnnual).sub(runningCostsTotalAnnual);
    const netRentMonthly = netRentAnnual.div(12);
    const yieldPct = grandTotalPrice.gt(0)
      ? netRentAnnual.div(grandTotalPrice).mul(100).toDP(2).toString()
      : '0';
    const purchasePriceError = rPurchasePriceD.lte(0);

    const trimmedName = rName.trim();
    const nameError = !trimmedName || existingNames.includes(trimmedName);
    const nameHelperText = !trimmedName
      ? 'Name darf nicht leer sein'
      : existingNames.includes(trimmedName)
        ? 'Name bereits vergeben'
        : ' ';

    const getCostValue = (item: CostItemState, base: Decimal): Decimal => {
      if (!item.enabled) return D(0);
      return item.mode === 'percent' ? base.mul(pctToFrac(item.value)) : D(normalize(item.value));
    };

    React.useImperativeHandle(ref, () => ({
      submit: () => {
        setIsPriceTouched(true);
        setIsNameTouched(true);

        if (purchasePriceError || nameError) {
          return;
        }

        const purchaseCostsData: PurchasePriceCosts = {
          brokerCommission: getCostValue(purchaseCosts.brokerCommission, rPurchasePriceD).toFixed(
            2,
          ),
          propertyTransferTax: getCostValue(
            purchaseCosts.propertyTransferTax,
            rPurchasePriceD,
          ).toFixed(2),
          notaryFees: getCostValue(purchaseCosts.notaryFees, rPurchasePriceD).toFixed(2),
          landRegistryFees: getCostValue(purchaseCosts.landRegistryFees, rPurchasePriceD).toFixed(
            2,
          ),
          total: purchaseCostsTotal.toFixed(2),
        };

        const additionalCostsData: AdditionalPurchasePriceCosts = {
          renovationCosts: getCostValue(additionalCosts.renovationCosts, rPurchasePriceD).toFixed(
            2,
          ),
          subvention: getCostValue(additionalCosts.subvention, rPurchasePriceD).toFixed(2),
          otherAdditionalCosts: getCostValue(
            additionalCosts.otherAdditionalCosts,
            rPurchasePriceD,
          ).toFixed(2),
          appraisalFee: getCostValue(additionalCosts.appraisalFee, rPurchasePriceD).toFixed(2),
          insuranceSetup: getCostValue(additionalCosts.insuranceSetup, rPurchasePriceD).toFixed(2),
          total: additionalCostsTotal.toFixed(2),
        };

        const runningCostsRentData: RunningCostsRent = {
          incomeTax: taxDeductions.incomeTax.enabled
            ? rAnnualColdRentD.mul(pctToFrac(taxDeductions.incomeTax.value)).toFixed(2)
            : '0.00',
          solidaritySurcharge: taxDeductions.solidaritySurcharge.enabled
            ? D(
                taxDeductions.incomeTax.enabled
                  ? rAnnualColdRentD.mul(pctToFrac(taxDeductions.incomeTax.value)).toFixed(2)
                  : '0.00',
              )
                .mul(pctToFrac(taxDeductions.solidaritySurcharge.value))
                .toFixed(2)
            : '0.00',
          churchTax: taxDeductions.churchTax.enabled
            ? D(
                taxDeductions.incomeTax.enabled
                  ? rAnnualColdRentD.mul(pctToFrac(taxDeductions.incomeTax.value)).toFixed(2)
                  : '0.00',
              )
                .mul(pctToFrac(taxDeductions.churchTax.value))
                .toFixed(2)
            : '0.00',
          otherDeductions: getCostValue(taxDeductions.otherDeductions, rAnnualColdRentD).toFixed(2),
          total: deductionsTotalAnnual.toFixed(2),
        };

        const houseFeeItem = runningCostsSplit.houseFee;
        const houseFeeNet = houseFeeItem.enabled
          ? (houseFeeItem.mode === 'percent'
              ? rMonthlyColdRentD.mul(pctToFrac(houseFeeItem.value1))
              : D(normalize(houseFeeItem.value1))
            ).sub(
              houseFeeItem.mode === 'percent'
                ? rMonthlyColdRentD.mul(pctToFrac(houseFeeItem.value2))
                : D(normalize(houseFeeItem.value2)),
            )
          : D(0);

        const additionalRunningCostsData: AdditionalRunningCostsRent = {
          houseFee: houseFeeNet.toFixed(2),
          other: otherRunningCostsTotalMonthly.toFixed(2),
          total: runningCostsTotalMonthly.toFixed(2),
        };

        const investmentData: RealEstateInvestment = {
          id: editId || `re_${Date.now()}`,
          name: trimmedName,
          kind: 'REAL_ESTATE',
          currency: rCurrency,
          purchasePrice: rPurchasePriceD.toFixed(2),
          totalPrice: grandTotalPrice.toFixed(2),
          netGainMonthly: netRentMonthly.toFixed(2),
          netGainYearly: netRentAnnual.toFixed(2),
          returnPercent: yieldPct,
          monthlyColdRent: rMonthlyColdRentD.toFixed(2),
          purchaseCosts: purchaseCostsData,
          additionalPurchaseCosts: additionalCostsData,
          totalAdditionalPurchaseCosts: additionalCostsTotal.toFixed(2),
          runningCostsRent: runningCostsRentData,
          additionalRunningCostsRent: additionalRunningCostsData,
          totalRunningCostsAnnually: runningCostsTotalAnnual.toFixed(2),
          details: {
            address: '',
            landAreaSqm: 0,
            link: '',
            livingAreaSqm: 0,
            numberOfFloors: 0,
            rooms: 0,
            type: '',
            usableAreaSqm: 0,
          },
        };

        if (editId) {
          updateRealEstate(investmentData);
        } else {
          addRealEstate(investmentData);
        }

        onClose();
      },
      isValid: () => !purchasePriceError && !nameError,
    }));

    return (
      <Stack spacing={3} sx={{ mt: 1 }}>
        <TextField
          label="Name"
          value={rName}
          onChange={(e) => setRName(e.target.value)}
          onBlur={() => setIsNameTouched(true)}
          error={isNameTouched && nameError}
          helperText={isNameTouched ? nameHelperText : ' '}
          fullWidth
          required
        />{' '}
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
          title="Weitere Kaufnebenkosten"
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
              <Typography fontWeight={700}>Weitere Laufende Kosten</Typography>
              <Typography color="text.secondary">
                Kosten: {fmtMoney(runningCostsTotalMonthly.toString())}
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <SplitCostInputRow
                item={runningCostsSplit.houseFee}
                onItemChange={(newValues) => handleSplitCostChange('houseFee', newValues)}
                baseAmount={rMonthlyColdRentD}
                currency={rCurrency}
              />
              {Object.entries(otherRunningCosts).map(([key, item]) => (
                <CostInputRow
                  key={key}
                  item={item}
                  onItemChange={(newValues) =>
                    handleCostChange(setOtherRunningCosts)(key, newValues)
                  }
                  baseAmount={rMonthlyColdRentD}
                  currency={rCurrency}
                />
              ))}
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
          <ResultRow
            label="Jährliche laufende Kosten"
            value={fmtMoney(runningCostsTotalAnnual.toString())}
          />
          <ResultRow
            label="Monatliche Nettomiete (nach Abzügen & Kosten)"
            value={fmtMoney(netRentMonthly.toString())}
          />
          <ResultRow
            label="Jährliche Nettomiete (nach Abzügen & Kosten)"
            value={fmtMoney(netRentAnnual.toString())}
          />
          <ResultRow label="Anfangsrendite p.a." value={`${yieldPct} %`} isBold />
        </Stack>
      </Stack>
    );
  },
);

export default RealEstateForm;
