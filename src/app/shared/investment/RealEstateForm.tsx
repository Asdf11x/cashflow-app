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
  type TextFieldProps,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'react-i18next';
import { D, normalize, sanitizeDecimal, pctToFrac } from './formHelpers';
import { ResultRow, CurrencySelect, PriceInput } from '../SharedComponents.tsx';
import { fmtMoney } from '../../../core/domain/calc';
import Decimal from 'decimal.js';
import type { CostItemState, CostState } from './formHelpers';
import { useInvestStore } from '../../../core/state/useInvestStore.ts';
import type {
  RealEstateInvestment,
  PurchasePriceCosts,
  AdditionalPurchasePriceCosts,
  RunningCostsRent,
  AdditionalRunningCostsRent,
  RealEstateInvestmentDetails,
} from '../../../core/domain/types.ts';
import { useSettingsStore } from '../../../core/state/useSettingsStore.ts';

// Import default value configurations
import deDefaults from '../../../config/defaults/de/default-values.json';
import chDefaults from '../../../config/defaults/ch/default-values.json';
import czDefaults from '../../../config/defaults/cz/default-values.json';

// Define a type for the structure of the default values JSON files
type DefaultsConfig = typeof deDefaults;

// Create a record mapping country codes to their default configuration
const allDefaults: Record<string, DefaultsConfig> = {
  de: deDefaults,
  cz: czDefaults,
  ch: chDefaults,
};

interface SplitCostItemState {
  enabled: boolean;
  value1: string;
  value2: string;
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
          inputProps={{
            inputMode: 'decimal',
            pattern: '[0-9]*[.,]?[0-9]*',
          }}
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

interface SplitCostInputRowProps {
  item: SplitCostItemState;
  onItemChange: (newItem: Partial<SplitCostItemState>) => void;
  baseAmount: Decimal;
  currency: string;
}

function SplitCostInputRow({ item, onItemChange, baseAmount, currency }: SplitCostInputRowProps) {
  const { t } = useTranslation();
  const { enabled, value1, value2, mode, allowModeChange, label1, label2 } = item;
  const isPercent = mode === 'percent';

  const handleToggleMode = () => {
    const newMode = mode === 'percent' ? 'currency' : 'percent';
    let nextValue1 = '0';
    let nextValue2 = '0';

    if (newMode === 'percent') {
      nextValue1 = baseAmount.gt(0)
        ? D(normalize(value1)).div(baseAmount).mul(100).toDP(2).toString()
        : '0';
      nextValue2 = baseAmount.gt(0)
        ? D(normalize(value2)).div(baseAmount).mul(100).toDP(2).toString()
        : '0';
    } else {
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
            inputProps={{
              inputMode: 'decimal',
              pattern: '[0-9]*[.,]?[0-9]*',
            }}
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
            inputProps={{
              inputMode: 'decimal',
              pattern: '[0-9]*[.,]?[0-9]*',
            }}
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 2 }}>
          <Typography fontWeight={700}>{title}</Typography>
          <Typography color="text.secondary">
            {fmtMoney(total.toFixed(0).toString())} {currency}
          </Typography>
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

function DetailInput(props: TextFieldProps) {
  return <TextField variant="outlined" size="small" {...props} />;
}

interface DetailsAccordionProps {
  linkValue: string;
  onLinkChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function DetailsAccordion({ linkValue, onLinkChange }: DetailsAccordionProps) {
  const { t } = useTranslation();
  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography fontWeight={700}>{t('realEstateForm.accordions.details')}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <DetailInput
          name="link"
          label={t('realEstateForm.details.link')}
          value={linkValue}
          onChange={onLinkChange}
          fullWidth
        />
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
    const { t } = useTranslation();
    const { addRealEstate, updateRealEstate, realEstates } = useInvestStore.getState();
    const { countryProfile } = useSettingsStore();

    const defaults = React.useMemo(() => {
      return allDefaults[countryProfile] || deDefaults;
    }, [countryProfile]);

    const reDefaults = defaults.investments.realEstate;
    const { currency: metaCurrency } = defaults.meta;

    const [rName, setRName] = React.useState(t(reDefaults.basic.name.i18nKey));
    const [isNameTouched, setIsNameTouched] = React.useState(false);
    const [rPurchasePrice, setRPurchasePrice] = React.useState(reDefaults.basic.purchasePrice);
    const [rCurrency, setRCurrency] = React.useState(metaCurrency);
    const [rMonthlyColdRent, setRMonthlyColdRent] = React.useState(
      reDefaults.basic.monthlyColdRent,
    );
    const [rDetailsLink, setRDetailsLink] = React.useState(reDefaults.basic.detailsLink);

    const mapDefaultsToCostState = (
      defaultCosts: Record<string, any>,
      t: (key: string) => string,
    ): CostState => {
      return Object.fromEntries(
        Object.entries(defaultCosts).map(([key, def]) => [
          key,
          {
            enabled: def.enabled,
            value: String(def.value),
            mode: def.mode,
            allowModeChange: def.allowModeChange,
            label: t(def.i18nKey),
          },
        ]),
      );
    };

    const [purchaseCosts, setPurchaseCosts] = React.useState<CostState>(
      mapDefaultsToCostState(reDefaults.purchaseCosts.basic, t),
    );

    const [additionalCosts, setAdditionalCosts] = React.useState<CostState>(
      mapDefaultsToCostState(reDefaults.purchaseCosts.additional, t),
    );

    const [taxDeductions, setTaxDeductions] = React.useState<CostState>(
      mapDefaultsToCostState(reDefaults.runningCosts.rentTaxes, t),
    );

    const [runningCostsSplit, setRunningCostsSplit] = React.useState({
      houseFee: {
        enabled: reDefaults.runningCosts.additional.houseFee.enabled,
        value1: reDefaults.runningCosts.additional.houseFee.value1,
        value2: reDefaults.runningCosts.additional.houseFee.value2,
        mode: reDefaults.runningCosts.additional.houseFee.mode,
        allowModeChange: reDefaults.runningCosts.additional.houseFee.allowModeChange,
        label1: t(reDefaults.runningCosts.additional.houseFee.i18nKeyTotal),
        label2: t(reDefaults.runningCosts.additional.houseFee.i18nKeyApportionable),
      } as SplitCostItemState,
    });

    const [otherRunningCosts, setOtherRunningCosts] = React.useState<CostState>(
      mapDefaultsToCostState(
        { other: reDefaults.runningCosts.additional.other }, // needs to be wrapped
        t,
      ),
    );

    const [isPriceTouched, setIsPriceTouched] = React.useState(false);

    React.useEffect(() => {
      if (!editId) {
        setRName(t('realEstateForm.defaultName'));
        return;
      }

      const existing = realEstates.find((r) => r.id === editId);
      if (!existing) return;

      setRName(existing.name);
      setRCurrency(existing.currency);
      setRPurchasePrice(D(existing.startAmount).toFixed(0));
      setRMonthlyColdRent(D(existing.monthlyColdRent).toFixed(0));

      if (existing.details) {
        setRDetailsLink(existing.link ?? '');
      }

      const pcData = existing.purchaseCosts;
      setPurchaseCosts((prev) => ({
        ...prev,
        brokerCommission: { ...prev.brokerCommission, enabled: D(pcData.brokerCommission).gt(0) },
        propertyTransferTax: {
          ...prev.propertyTransferTax,
          enabled: D(pcData.propertyTransferTax).gt(0),
        },
        notaryFees: { ...prev.notaryFees, enabled: D(pcData.notaryFees).gt(0) },
        landRegistryFees: { ...prev.landRegistryFees, enabled: D(pcData.landRegistryFees).gt(0) },
      }));

      const acData = existing.additionalPurchaseCosts;
      setAdditionalCosts((prev) => {
        const newState = { ...prev };
        Object.keys(newState).forEach((key) => {
          const storedValueRaw = acData[key as keyof typeof acData];
          if (typeof storedValueRaw !== 'undefined' && key !== 'total') {
            const storedValue = D(storedValueRaw);
            if (storedValue.gt(0)) {
              newState[key] = {
                ...newState[key],
                enabled: true,
                value: storedValue.toFixed(0),
                mode: 'currency',
              };
            } else {
              newState[key] = {
                ...newState[key],
                enabled: false,
              };
            }
          }
        });
        return newState;
      });

      const taxData = existing.runningCostsRent;
      setTaxDeductions((prev) => ({
        ...prev,
        incomeTax: { ...prev.incomeTax, enabled: D(taxData.incomeTax).gt(0) },
        solidaritySurcharge: {
          ...prev.solidaritySurcharge,
          enabled: D(taxData.solidaritySurcharge).gt(0),
        },
        churchTax: {
          ...prev.churchTax,
          enabled: D(taxData.churchTax ?? '0').gt(0),
        },
        otherDeductions: {
          ...prev.otherDeductions,
          enabled: D(taxData.otherDeductions ?? '0').gt(0),
          value: D(taxData.otherDeductions ?? '0').toFixed(0),
          mode: 'currency',
        },
      }));

      const arcr = existing.additionalRunningCostsRent;
      const houseFeeTotal = D(arcr.houseFeeTotal ?? '0');
      const houseFeeApportionable = D(arcr.houseFeeApportionable ?? '0');
      const houseFeeNet = D(arcr.houseFee);

      if (houseFeeTotal.gt(0) || houseFeeApportionable.gt(0) || houseFeeNet.gt(0)) {
        setRunningCostsSplit((prev) => ({
          ...prev,
          houseFee: {
            ...prev.houseFee,
            enabled: true,
            value1: houseFeeTotal.gt(0) ? houseFeeTotal.toFixed(0) : houseFeeNet.toFixed(0),
            value2: houseFeeApportionable.toFixed(0),
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
    }, [editId, realEstates, t]);

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
      ? t('realEstateForm.nameHelperEmpty')
      : existingNames.includes(trimmedName)
        ? t('realEstateForm.nameHelperInUse')
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
        const houseFeeVal1 = houseFeeItem.enabled
          ? houseFeeItem.mode === 'percent'
            ? rMonthlyColdRentD.mul(pctToFrac(houseFeeItem.value1))
            : D(normalize(houseFeeItem.value1))
          : D(0);

        const houseFeeVal2 = houseFeeItem.enabled
          ? houseFeeItem.mode === 'percent'
            ? rMonthlyColdRentD.mul(pctToFrac(houseFeeItem.value2))
            : D(normalize(houseFeeItem.value2))
          : D(0);

        const houseFeeNet = houseFeeVal1.sub(houseFeeVal2);

        const additionalRunningCostsData: AdditionalRunningCostsRent = {
          houseFee: houseFeeNet.toFixed(2),
          houseFeeTotal: houseFeeVal1.toFixed(2),
          houseFeeApportionable: houseFeeVal2.toFixed(2),
          other: otherRunningCostsTotalMonthly.toFixed(2),
          total: runningCostsTotalMonthly.toFixed(2),
        };

        const detailsData: RealEstateInvestmentDetails = {
          address: '',
          propertyType: '',
          numberOfFloors: 0,
          livingAreaSqm: 0,
          usableAreaSqm: 0,
          landAreaSqm: 0,
          rooms: 0,
        };

        const investmentData: RealEstateInvestment = {
          id: editId || `re_${Date.now()}`,
          name: trimmedName,
          link: rDetailsLink,
          kind: 'REAL_ESTATE',
          currency: rCurrency,
          startAmount: rPurchasePriceD.toFixed(2),
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
          details: detailsData,
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
          label={t('realEstateForm.nameLabel')}
          value={rName}
          onChange={(e) => setRName(e.target.value)}
          onBlur={() => setIsNameTouched(true)}
          error={isNameTouched && nameError}
          helperText={isNameTouched ? nameHelperText : ' '}
          fullWidth
          required
        />
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <PriceInput
            label={t('realEstateForm.purchasePriceLabel')}
            value={rPurchasePrice}
            onChange={(e) => setRPurchasePrice(sanitizeDecimal(e.target.value))}
            onBlur={() => setIsPriceTouched(true)}
            error={isPriceTouched && purchasePriceError}
            helperText={
              isPriceTouched && purchasePriceError ? t('realEstateForm.purchasePriceHelper') : ' '
            }
          />
          <CurrencySelect value={rCurrency} onChange={(e) => setRCurrency(e.target.value)} />
        </Box>
        <DetailsAccordion
          linkValue={rDetailsLink}
          onLinkChange={(e) => setRDetailsLink(e.target.value)}
        />
        <CostSectionAccordion
          title={t('realEstateForm.accordions.purchaseCosts')}
          costs={purchaseCosts}
          onCostChange={handleCostChange(setPurchaseCosts)}
          baseAmount={rPurchasePriceD}
          currency={rCurrency}
          total={purchaseCostsTotal}
        />
        <CostSectionAccordion
          title={t('realEstateForm.accordions.additionalPurchaseCosts')}
          costs={additionalCosts}
          onCostChange={handleCostChange(setAdditionalCosts)}
          baseAmount={rPurchasePriceD}
          currency={rCurrency}
          total={additionalCostsTotal}
        />
        <Divider />
        <TextField
          label={t('realEstateForm.monthlyColdRentLabel')}
          type="text"
          inputProps={{
            inputMode: 'decimal',
            pattern: '[0-9]*[.,]?[0-9]*',
          }}
          value={rMonthlyColdRent}
          onChange={(e) => setRMonthlyColdRent(sanitizeDecimal(e.target.value))}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    ({t('realEstateForm.annually')} {fmtMoney(rAnnualColdRentD.toString())})
                  </Typography>
                  <Typography>{rCurrency}</Typography>
                </Stack>
              </InputAdornment>
            ),
          }}
          fullWidth
        />
        <CostSectionAccordion
          title={t('realEstateForm.accordions.taxDeductions')}
          costs={taxDeductions}
          onCostChange={handleCostChange(setTaxDeductions)}
          baseAmount={rAnnualColdRentD}
          currency={rCurrency}
          total={deductionsTotalAnnual.div(12)}
        />
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 2 }}>
              <Typography fontWeight={700}>
                {t('realEstateForm.accordions.otherRunningCosts')}
              </Typography>
              <Typography color="text.secondary">
                {fmtMoney(runningCostsTotalMonthly.toString())} {rCurrency}
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <SplitCostInputRow
                item={{
                  ...runningCostsSplit.houseFee,
                  label1: t(runningCostsSplit.houseFee.label1),
                  label2: t(runningCostsSplit.houseFee.label2),
                }}
                onItemChange={(newValues) => handleSplitCostChange('houseFee', newValues)}
                baseAmount={rMonthlyColdRentD}
                currency={rCurrency}
              />
              {Object.entries(otherRunningCosts).map(([key, item]) => (
                <CostInputRow
                  key={key}
                  item={{ ...item, label: t(item.label) }}
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
          <Typography variant="h6">{t('realEstateForm.summary.title')}</Typography>
          <ResultRow
            label={t('realEstateForm.summary.totalSideCosts')}
            value={`${fmtMoney(totalPurchaseSideCosts.toString())} ${rCurrency}`}
          />
          <ResultRow
            label={t('realEstateForm.summary.grandTotal')}
            value={`${fmtMoney(grandTotalPrice.toString())} ${rCurrency}`}
            isBold
          />
          <Divider sx={{ my: 1 }} />
          <ResultRow
            label={t('realEstateForm.summary.annualRunningCosts')}
            value={`${fmtMoney(runningCostsTotalAnnual.toString())} ${rCurrency}`}
          />
          <ResultRow
            label={t('realEstateForm.summary.netRentMonthly')}
            value={`${fmtMoney(netRentMonthly.toString())} ${rCurrency}`}
          />
          <ResultRow
            label={t('realEstateForm.summary.netRentYearly')}
            value={`${fmtMoney(netRentAnnual.toString())} ${rCurrency}`}
          />
          <ResultRow
            label={t('realEstateForm.summary.initialYield')}
            value={`${yieldPct} %`}
            isBold
          />
        </Stack>
      </Stack>
    );
  },
);

export default RealEstateForm;
