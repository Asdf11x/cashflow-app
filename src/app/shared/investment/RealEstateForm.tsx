// src/components/shared/investment/RealEstateForm.tsx

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
import { D, normalize, sanitizeDecimal } from './formHelpers';
import { useInvestStore } from '../../../core/state/useInvestStore';
import { useSettingsStore } from '../../../core/state/useSettingsStore';
import type { CostState } from './formHelpers';
import type {
  AdditionalPurchasePriceCosts,
  AdditionalRunningCostsRent,
  PurchasePriceCosts,
  RealEstateInvestment,
  RunningCostsRent,
} from '../../../core/domain/types';

// Import default value configurations
import deDefaults from '../../../config/defaults/de/default-values.json';
import chDefaults from '../../../config/defaults/ch/default-values.json';
import czDefaults from '../../../config/defaults/cz/default-values.json';

// Import the sub-components and their handles
import FormHeader from './real-estate-form/FormHeader';
import PurchaseCostsSection, {
  type PurchaseCostsSectionHandle,
} from './real-estate-form/PurchaseCostsSection';
import RunningCostsSection, {
  type RunningCostsSectionHandle,
} from './real-estate-form/RunningCostsSection';
import SummarySection from './real-estate-form/SummarySection';
import type { SplitCostItemState } from './real-estate-form/CostInputs';

type DefaultsConfig = typeof deDefaults;
const allDefaults: Record<string, DefaultsConfig> = {
  de: deDefaults,
  cz: czDefaults,
  ch: chDefaults,
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
    const { addRealEstate, updateRealEstate } = useInvestStore.getState();
    const { countryProfile } = useSettingsStore();

    // --- Refs for Child Components ---
    const purchaseCostsRef = React.useRef<PurchaseCostsSectionHandle>(null);
    const runningCostsRef = React.useRef<RunningCostsSectionHandle>(null);

    // --- Default Values ---
    const defaults = React.useMemo(
      () => allDefaults[countryProfile] || deDefaults,
      [countryProfile],
    );
    const reDefaults = defaults.investments.realEstate;
    const metaCurrency = defaults.meta.currency === 'EUR' ? '€' : defaults.meta.currency;

    const mapDefaultsToCostState = (
      defaultCosts: Record<string, any>,
      t: (key: string) => string,
    ): CostState =>
      Object.fromEntries(
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

    const initialPurchaseCosts = mapDefaultsToCostState(reDefaults.purchaseCosts.basic, t);
    const initialAdditionalCosts = mapDefaultsToCostState(reDefaults.purchaseCosts.additional, t);
    const initialTaxDeductions = mapDefaultsToCostState(reDefaults.runningCosts.rentTaxes, t);
    const initialOtherRunningCosts = mapDefaultsToCostState(
      { other: reDefaults.runningCosts.additional.other },
      t,
    );
    const initialRunningCostsSplit = {
      houseFee: {
        enabled: reDefaults.runningCosts.additional.houseFee.enabled,
        value1: reDefaults.runningCosts.additional.houseFee.value1,
        value2: reDefaults.runningCosts.additional.houseFee.value2,
        mode: reDefaults.runningCosts.additional.houseFee.mode,
        allowModeChange: reDefaults.runningCosts.additional.houseFee.allowModeChange,
        label1: t(reDefaults.runningCosts.additional.houseFee.i18nKeyTotal),
        label2: t(reDefaults.runningCosts.additional.houseFee.i18nKeyApportionable),
      } as SplitCostItemState,
    };
    const initialPurchaseStates = {
      purchaseCosts: initialPurchaseCosts,
      additionalCosts: initialAdditionalCosts,
    };
    const initialRunningStates = {
      taxDeductions: initialTaxDeductions,
      runningCostsSplit: initialRunningCostsSplit,
      otherRunningCosts: initialOtherRunningCosts,
    };

    // --- Core State ---
    const [rName, setRName] = React.useState(t(reDefaults.basic.name.i18nKey));
    const [rPurchasePrice, setRPurchasePrice] = React.useState(reDefaults.basic.purchasePrice);
    const [rCurrency, setRCurrency] = React.useState(metaCurrency);
    const [rMonthlyColdRent, setRMonthlyColdRent] = React.useState(
      reDefaults.basic.monthlyColdRent,
    );
    const [rDetailsLink, setRDetailsLink] = React.useState(reDefaults.basic.detailsLink);

    // --- State for calculated totals from children ---
    const [totalPurchaseSideCosts, setTotalPurchaseSideCosts] = React.useState(D(0));
    const [totalRunningCostsAnnual, setTotalRunningCostsAnnual] = React.useState(D(0));

    // --- Validation State ---
    const [isNameTouched, setIsNameTouched] = React.useState(false);
    const [isPriceTouched, setIsPriceTouched] = React.useState(false);

    // --- Core Calculations ---
    const rPurchasePriceD = D(normalize(rPurchasePrice));
    const rMonthlyColdRentD = D(normalize(rMonthlyColdRent));

    const grandTotalPrice = rPurchasePriceD.add(totalPurchaseSideCosts);
    const netRentAnnual = rMonthlyColdRentD.mul(12).sub(totalRunningCostsAnnual);
    const netRentMonthly = netRentAnnual.div(12);
    const yieldPct = grandTotalPrice.gt(0)
      ? netRentAnnual.div(grandTotalPrice).mul(100).toDP(2).toString()
      : '0';

    // --- Validation ---
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

    const calculateCostStateTotal = (costState: CostState): Decimal => {
      return Object.values(costState).reduce((acc, item) => {
        if (item.enabled && item.value) {
          return acc.add(D(normalize(item.value)));
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

        // --- START: Data Transformation ---

        // 1. Transform basic purchase costs
        const purchaseCostsObject: PurchasePriceCosts = {
          brokerCommission: purchaseData.purchaseCosts.brokerCommission.value,
          propertyTransferTax: purchaseData.purchaseCosts.propertyTransferTax.value,
          notaryFees: purchaseData.purchaseCosts.notaryFees.value,
          landRegistryFees: purchaseData.purchaseCosts.landRegistryFees.value,
          total: calculateCostStateTotal(purchaseData.purchaseCosts).toString(),
        };

        // 2. Transform additional purchase costs
        const additionalPurchaseCostsObject: AdditionalPurchasePriceCosts = {
          renovationCosts: purchaseData.additionalCosts.renovationCosts?.value || '0',
          subvention: purchaseData.additionalCosts.subvention?.value || '0',
          otherAdditionalCosts: purchaseData.additionalCosts.otherAdditionalCosts?.value || '0',
          appraisalFee: purchaseData.additionalCosts.appraisalFee?.value || '0',
          insuranceSetup: purchaseData.additionalCosts.insuranceSetup?.value || '0',
          total: calculateCostStateTotal(purchaseData.additionalCosts).toString(),
        };

        // 3. Transform running costs (tax deductions)
        const runningCostsRentObject: RunningCostsRent = {
          incomeTax: runningData.taxDeductions.incomeTax.value,
          solidaritySurcharge: runningData.taxDeductions.solidaritySurcharge.value,
          churchTax: runningData.taxDeductions.churchTax?.value || '0',
          otherDeductions: runningData.taxDeductions.otherDeductions?.value || '0',
          total: calculateCostStateTotal(runningData.taxDeductions).toString(),
        };

        // 4. Transform additional running costs
        const additionalRunningCostsRentObject: AdditionalRunningCostsRent = {
          houseFee: runningData.runningCostsSplit.houseFee.value2, // Net (apportionable) value
          houseFeeTotal: runningData.runningCostsSplit.houseFee.value1,
          houseFeeApportionable: runningData.runningCostsSplit.houseFee.value2,
          other: runningData.otherRunningCosts.other.value,
          total: D(normalize(runningData.runningCostsSplit.houseFee.value2))
            .add(D(normalize(runningData.otherRunningCosts.other.value)))
            .toString(),
        };

        // --- END: Data Transformation ---

        // Construct the final object matching the RealEstateInvestment type
        const investmentData: RealEstateInvestment = {
          id: editId || crypto.randomUUID(),
          kind: 'REAL_ESTATE',
          name: trimmedName,
          currency: rCurrency,
          link: rDetailsLink,
          startAmount: rPurchasePrice, // Base purchase price

          // Main calculated outputs
          totalPrice: grandTotalPrice.toString(),
          netGainMonthly: netRentMonthly.toString(),
          netGainYearly: netRentAnnual.toString(),
          returnPercent: yieldPct,

          // Real estate specific data
          monthlyColdRent: rMonthlyColdRent,
          totalAdditionalPurchaseCosts: additionalPurchaseCostsObject.total,
          totalRunningCostsAnnually: totalRunningCostsAnnual.toString(),

          // Nested structured data
          purchaseCosts: purchaseCostsObject,
          additionalPurchaseCosts: additionalPurchaseCostsObject,
          runningCostsRent: runningCostsRentObject,
          additionalRunningCostsRent: additionalRunningCostsRentObject,

          // Details object (not in form, provide default empty values)
          details: {
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

    // --- THE FIX IS HERE ---
    // These handlers now prevent re-renders if the incoming value is the same.
    const handlePurchaseTotalChange = React.useCallback((newTotal: Decimal) => {
      setTotalPurchaseSideCosts((currentTotal) => {
        if (currentTotal.equals(newTotal)) {
          return currentTotal; // Return the same object to prevent re-render
        }
        return newTotal;
      });
    }, []);

    const handleRunningTotalChange = React.useCallback((newTotal: Decimal) => {
      setTotalRunningCostsAnnual((currentTotal) => {
        if (currentTotal.equals(newTotal)) {
          return currentTotal; // Return the same object to prevent re-render
        }
        return newTotal;
      });
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
        />

        <PurchaseCostsSection
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
