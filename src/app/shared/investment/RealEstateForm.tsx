import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Stack,
  Divider,
  TextField,
  InputAdornment,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import Decimal from 'decimal.js';
import { D, normalize, sanitizeDecimal, type CostState } from './formHelpers';
import { useInvestStore } from '../../../core/state/useInvestStore';
import { useSettingsStore } from '../../../core/state/useSettingsStore';
import type {
  AdditionalPurchasePriceCosts,
  AdditionalRunningCostsRent,
  PurchasePriceCosts,
  RealEstateInvestment,
  RunningCostsRent,
} from '../../../core/domain/types';

import deDefaults from '../../../config/defaults/de/default-values.json';
import chDefaults from '../../../config/defaults/ch/default-values.json';
import czDefaults from '../../../config/defaults/cz/default-values.json';

import FormHeader from './real-estate-form/FormHeader';
import PurchaseCostsSection, {
  type PurchaseCostsSectionHandle,
} from './real-estate-form/PurchaseCostsSection';
import RunningCostsSection, {
  type RunningCostsSectionHandle,
} from './real-estate-form/RunningCostsSection';
import SummarySection from './real-estate-form/SummarySection';

type DefaultsConfig = typeof deDefaults;
const allDefaults: Record<string, DefaultsConfig> = {
  de: deDefaults,
  cz: czDefaults,
  ch: chDefaults,
};

export type SplitCostItemState = {
  enabled: boolean;
  value1: string;
  value2: string;
  mode: 'percent' | 'currency';
  allowModeChange: boolean;
  label1: string;
  label2: string;
};

// --- Main Component ---
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
    const { addRealEstate, updateRealEstate, realEstates } = useInvestStore();
    const { countryProfile, mainCurrency } = useSettingsStore();

    const existingInvestment = React.useMemo(
      () => (editId ? realEstates.find((inv) => inv.id === editId) : undefined),
      [editId, realEstates],
    );

    const purchaseCostsRef = React.useRef<PurchaseCostsSectionHandle>(null);
    const runningCostsRef = React.useRef<RunningCostsSectionHandle>(null);

    const defaults = React.useMemo(
      () => allDefaults[countryProfile] || deDefaults,
      [countryProfile],
    );
    const reDefaults = defaults.investments.realEstate;

    const [rName, setRName] = React.useState('');
    const [rPurchasePrice, setRPurchasePrice] = React.useState('');
    const [rCurrency, setRCurrency] = React.useState('');
    const [rMonthlyColdRent, setRMonthlyColdRent] = React.useState('');
    const [rDetailsLink, setRDetailsLink] = React.useState('');

    React.useEffect(() => {
      setRName(existingInvestment?.name || t(reDefaults.basic.name.i18nKey));
      setRPurchasePrice(existingInvestment?.startAmount || reDefaults.basic.purchasePrice);
      setRCurrency(existingInvestment?.currency || mainCurrency);
      setRMonthlyColdRent(existingInvestment?.monthlyColdRent || reDefaults.basic.monthlyColdRent);
      setRDetailsLink(existingInvestment?.link || '');
    }, [existingInvestment, mainCurrency, reDefaults, t]);

    const { initialPurchaseStates, initialRunningStates } = React.useMemo(() => {
      const mapDefaultsToCostState = (
        defaultCosts: Record<string, any>,
        savedCosts?: Record<string, string | undefined>,
      ): CostState =>
        Object.fromEntries(
          Object.entries(defaultCosts).map(([key, def]) => {
            const savedValue = savedCosts?.[key as keyof typeof savedCosts];
            const isEnabled = savedValue !== undefined ? D(savedValue).gt(0) : def.enabled;
            return [
              key,
              {
                enabled: isEnabled,
                value: savedValue !== undefined ? savedValue : String(def.value),
                mode: def.mode,
                allowModeChange: def.allowModeChange,
                label: t(def.i18nKey),
              },
            ];
          }),
        );

      const purchaseStates = {
        purchaseCosts: mapDefaultsToCostState(
          reDefaults.purchaseCosts.basic,
          existingInvestment?.purchaseCosts as Record<string, string> | undefined,
        ),
        additionalCosts: mapDefaultsToCostState(
          reDefaults.purchaseCosts.additional,
          existingInvestment?.additionalPurchaseCosts as Record<string, string> | undefined,
        ),
      };

      const runningStates = {
        taxDeductions: mapDefaultsToCostState(
          reDefaults.runningCosts.rentTaxes,
          existingInvestment?.runningCostsRent as Record<string, string> | undefined,
        ),
        otherRunningCosts: mapDefaultsToCostState(
          { other: reDefaults.runningCosts.additional.other },
          existingInvestment?.additionalRunningCostsRent as Record<string, string> | undefined,
        ),
        runningCostsSplit: {
          houseFee: {
            enabled: existingInvestment?.additionalRunningCostsRent?.houseFeeTotal
              ? D(existingInvestment.additionalRunningCostsRent.houseFeeTotal).gt(0)
              : reDefaults.runningCosts.additional.houseFee.enabled,
            value1:
              existingInvestment?.additionalRunningCostsRent?.houseFeeTotal ||
              reDefaults.runningCosts.additional.houseFee.value1,
            value2:
              existingInvestment?.additionalRunningCostsRent?.houseFeeApportionable ||
              reDefaults.runningCosts.additional.houseFee.value2,
            mode: reDefaults.runningCosts.additional.houseFee.mode,
            allowModeChange: reDefaults.runningCosts.additional.houseFee.allowModeChange,
            label1: t(reDefaults.runningCosts.additional.houseFee.i18nKeyTotal),
            label2: t(reDefaults.runningCosts.additional.houseFee.i18nKeyApportionable),
          } as SplitCostItemState,
        },
      };

      return { initialPurchaseStates: purchaseStates, initialRunningStates: runningStates };
    }, [existingInvestment, reDefaults, t]);

    const [totalPurchaseSideCosts, setTotalPurchaseSideCosts] = React.useState(D(0));
    const [totalRunningCostsAnnual, setTotalRunningCostsAnnual] = React.useState(D(0));
    const [isNameTouched, setIsNameTouched] = React.useState(false);
    const [isPriceTouched, setIsPriceTouched] = React.useState(false);

    const rPurchasePriceD = D(normalize(rPurchasePrice));
    const rMonthlyColdRentD = D(normalize(rMonthlyColdRent));
    const grandTotalPrice = rPurchasePriceD.add(totalPurchaseSideCosts);
    const netRentAnnual = rMonthlyColdRentD.mul(12).sub(totalRunningCostsAnnual);
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
    const priceHelperText =
      isPriceTouched && purchasePriceError ? t('realEstateForm.purchasePriceHelper') : ' ';

    const calculateCostStateTotal = (costState: CostState, base: Decimal): Decimal => {
      return Object.values(costState).reduce((acc, item) => {
        if (item.enabled && item.value) {
          const value =
            item.mode === 'percent' ? base.mul(D(item.value).div(100)) : D(normalize(item.value));
          return acc.add(value);
        }
        return acc;
      }, D(0));
    };

    React.useImperativeHandle(ref, () => ({
      isValid: () => !purchasePriceError && !nameError,
      submit: () => {
        setIsPriceTouched(true);
        setIsNameTouched(true);
        if (purchasePriceError || nameError) return;

        const purchaseData = purchaseCostsRef.current?.getData();
        const runningData = runningCostsRef.current?.getData();

        if (!purchaseData || !runningData) {
          console.error('Child component data is not available.');
          return;
        }

        const transformCostState = (state: CostState): Record<string, string> =>
          Object.fromEntries(
            Object.entries(state).map(([key, item]) => [
              key,
              item.enabled ? normalize(item.value) : '0',
            ]),
          );

        const purchaseCostsObject = transformCostState(
          purchaseData.purchaseCosts,
        ) as unknown as PurchasePriceCosts;
        purchaseCostsObject.total = calculateCostStateTotal(
          purchaseData.purchaseCosts,
          rPurchasePriceD,
        ).toString();

        const additionalPurchaseCostsObject = transformCostState(
          purchaseData.additionalCosts,
        ) as unknown as AdditionalPurchasePriceCosts;
        additionalPurchaseCostsObject.total = calculateCostStateTotal(
          purchaseData.additionalCosts,
          rPurchasePriceD,
        ).toString();

        const runningCostsRentObject = transformCostState(
          runningData.taxDeductions,
        ) as unknown as RunningCostsRent;
        runningCostsRentObject.total = calculateCostStateTotal(
          runningData.taxDeductions,
          rMonthlyColdRentD.mul(12),
        ).toString();

        const otherRunningCostsValue = runningData.otherRunningCosts.other.enabled
          ? normalize(runningData.otherRunningCosts.other.value)
          : '0';
        const houseFeeTotalValue = runningData.runningCostsSplit.houseFee.enabled
          ? normalize(runningData.runningCostsSplit.houseFee.value1)
          : '0';
        const houseFeeApportionableValue = runningData.runningCostsSplit.houseFee.enabled
          ? normalize(runningData.runningCostsSplit.houseFee.value2)
          : '0';

        const additionalRunningCostsRentObject: AdditionalRunningCostsRent = {
          houseFee: houseFeeApportionableValue,
          houseFeeTotal: houseFeeTotalValue,
          houseFeeApportionable: houseFeeApportionableValue,
          other: otherRunningCostsValue,
          total: D(houseFeeApportionableValue).add(otherRunningCostsValue).toString(),
        };

        const investmentData: RealEstateInvestment = {
          id: editId || `re_${crypto.randomUUID()}`,
          kind: 'REAL_ESTATE',
          name: trimmedName,
          currency: rCurrency,
          link: rDetailsLink,
          startAmount: normalize(rPurchasePrice),
          totalPrice: grandTotalPrice.toString(),
          netGainMonthly: netRentMonthly.toString(),
          netGainYearly: netRentAnnual.toString(),
          returnPercent: yieldPct,
          monthlyColdRent: normalize(rMonthlyColdRent),
          totalAdditionalPurchaseCosts: additionalPurchaseCostsObject.total,
          totalRunningCostsAnnually: totalRunningCostsAnnual.toString(),
          purchaseCosts: purchaseCostsObject,
          additionalPurchaseCosts: additionalPurchaseCostsObject,
          runningCostsRent: runningCostsRentObject,
          additionalRunningCostsRent: additionalRunningCostsRentObject,
          details: existingInvestment?.details || {
            address: '',
            propertyType: '',
            numberOfFloors: 0,
            livingAreaSqm: 0,
            usableAreaSqm: 0,
            landAreaSqm: 0,
            rooms: 0,
          },
        };

        if (editId) {
          updateRealEstate(investmentData);
        } else {
          addRealEstate(investmentData);
        }

        onClose();
      },
    }));

    const handlePurchaseTotalChange = React.useCallback((newTotal: Decimal) => {
      setTotalPurchaseSideCosts((current) => (current.equals(newTotal) ? current : newTotal));
    }, []);

    const handleRunningTotalChange = React.useCallback((newTotal: Decimal) => {
      setTotalRunningCostsAnnual((current) => (current.equals(newTotal) ? current : newTotal));
    }, []);

    return (
      <Stack spacing={3} sx={{ mt: 1 }}>
        <FormHeader
          name={rName}
          onNameChange={(e) => setRName(e.target.value)}
          onNameBlur={() => setIsNameTouched(true)}
          isNameTouched={isNameTouched}
          nameError={nameError}
          nameHelperText={nameHelperText}
          purchasePrice={rPurchasePrice}
          onPurchasePriceChange={(e) => setRPurchasePrice(sanitizeDecimal(e.target.value))}
          onPurchasePriceBlur={() => setIsPriceTouched(true)}
          isPriceTouched={isPriceTouched}
          priceError={purchasePriceError}
          priceHelperText={priceHelperText}
          currency={rCurrency}
          onCurrencyChange={(e: SelectChangeEvent) => setRCurrency(e.target.value as string)}
          link={rDetailsLink}
          onLinkChange={(e) => setRDetailsLink(e.target.value)}
          isEditing={!!editId}
        />

        <PurchaseCostsSection
          key={editId || 'new-purchase'}
          ref={purchaseCostsRef}
          baseAmount={rPurchasePriceD}
          currency={rCurrency}
          initialStates={initialPurchaseStates}
          onTotalChange={handlePurchaseTotalChange}
        />

        <Divider />

        <TextField
          label={t('realEstateForm.monthlyColdRentLabel')}
          value={rMonthlyColdRent}
          onChange={(e) => setRMonthlyColdRent(sanitizeDecimal(e.target.value))}
          fullWidth
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Typography>{rCurrency}</Typography>
              </InputAdornment>
            ),
          }}
        />

        <RunningCostsSection
          key={editId ? `${editId}-running` : 'new-running'}
          ref={runningCostsRef}
          baseAmount={rMonthlyColdRentD}
          currency={rCurrency}
          initialStates={initialRunningStates}
          onTotalChange={handleRunningTotalChange}
        />

        <SummarySection
          currency={rCurrency}
          totalPurchaseSideCosts={totalPurchaseSideCosts}
          grandTotalPrice={grandTotalPrice}
          netRentMonthly={netRentMonthly}
          netRentAnnual={netRentAnnual}
          yieldPct={yieldPct}
        />
      </Stack>
    );
  },
);

export default RealEstateForm;
