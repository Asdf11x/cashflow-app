// --- START OF FILE StockForm.tsx ---

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Stack,
  TextField,
  Box,
  Divider,
  InputAdornment,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { D, normalize, sanitizeDecimal, type CostState } from './formHelpers';
import { ResultRow, CurrencySelect, PriceInput } from '../SharedComponents.tsx';
import { fmtMoney } from '../../../core/domain/calc';
import { useInvestStore } from '../../../core/state/useInvestStore.ts';
import { type StockInvestment } from '../../../core/domain/types.ts';
import { useDefaults } from '../../../core/hooks/useDefaults.ts';
import { TaxDeductionsAccordion } from './TaxDeductionsAccordion.tsx';
import { CostInputRow } from './real-estate-form/CostInputs.tsx';

const StockForm = React.forwardRef(
  (
    {
      onClose,
      existingNames,
      editId,
    }: {
      onClose: () => void;
      existingNames: string[];
      editId?: string;
    },
    ref,
  ) => {
    const { t } = useTranslation();
    const defaults = useDefaults();

    // Fallback/Simulated Stock Defaults
    const stockDefaults = defaults.investments.stocks || {
      basic: {
        name: { i18nKey: 'stockForm.defaultName' },
        startAmount: '100',
        numberOfShares: '10',
        dividendPerShare: '1.2',
      },
      costs: {
        orderCostBuy: {
          enabled: true,
          value: '9.99',
          mode: 'currency',
          allowModeChange: false,
          i18nKey: 'stockForm.costs.orderCostBuy',
        },
        orderCostSell: {
          enabled: true,
          value: '9.99',
          mode: 'currency',
          allowModeChange: false,
          i18nKey: 'stockForm.costs.orderCostSell',
        },
        depotCostsYearly: {
          enabled: false,
          value: '0',
          mode: 'currency',
          allowModeChange: true,
          i18nKey: 'stockForm.costs.depotCostsYearly',
        },
      },
      taxes: {
        capitalGainsTaxRate: 25,
        solidaritySurchargeRate: 5.5,
        churchTaxRate: 0,
        taxFreeAllowance: '1000',
      },
      exit: {
        sellingCosts: '19.99',
      },
    };

    const { currency: metaCurrency } = defaults.meta;

    const { addStock, updateStock, stocks } = useInvestStore.getState();
    const existingStock = editId ? stocks.find((d) => d.id === editId) : undefined;

    // Initializers
    const initName = existingStock?.name || t(stockDefaults.basic.name.i18nKey);
    const initIsinWkn = existingStock?.isinWkn || '';
    const initStartAmount = existingStock?.startAmount || stockDefaults.basic.startAmount;
    const initCurrency = existingStock?.currency || metaCurrency;
    const initNumberOfShares = existingStock?.numberOfShares
      ? String(existingStock.numberOfShares)
      : stockDefaults.basic.numberOfShares;
    const initCurrentPrice = existingStock?.currentPrice || initStartAmount;
    const initExpectedPrice = existingStock?.expectedPrice || initStartAmount;
    const initDividendPerShare =
      existingStock?.dividendPerShare || stockDefaults.basic.dividendPerShare;
    const initLink = existingStock?.link || '';

    // State for Basic/Price Inputs
    const [sName, setSName] = React.useState(initName);
    const [sIsinWkn, setSIsinWkn] = React.useState(initIsinWkn);
    const [sLink, setSLink] = React.useState(initLink);
    const [sPurchasePrice, setSPurchasePrice] = React.useState(D(initStartAmount).toFixed(2));
    const [sCurrency, setSCurrency] = React.useState(initCurrency);
    const [sNumberOfShares, setSNumberOfShares] = React.useState(initNumberOfShares);
    const [sCurrentPrice, setSCurrentPrice] = React.useState(D(initCurrentPrice).toFixed(2));
    const [sExpectedPrice, setSExpectedPrice] = React.useState(D(initExpectedPrice).toFixed(2));

    // Memoize the initial running costs state
    const initialRunningCosts = React.useMemo<CostState>(
      () => ({
        orderCostBuy: {
          enabled: existingStock?.orderCostBuy
            ? D(existingStock.orderCostBuy).gt(0)
            : stockDefaults.costs.orderCostBuy.enabled,
          value: existingStock?.orderCostBuy || stockDefaults.costs.orderCostBuy.value,
          mode: stockDefaults.costs.orderCostBuy.mode as 'currency' | 'percent',
          allowModeChange: stockDefaults.costs.orderCostBuy.allowModeChange,
          label: stockDefaults.costs.orderCostBuy.i18nKey, // Store key, translate in component
        },
        orderCostSell: {
          enabled: existingStock?.orderCostSell
            ? D(existingStock.orderCostSell).gt(0)
            : stockDefaults.costs.orderCostSell.enabled,
          value: existingStock?.orderCostSell || stockDefaults.costs.orderCostSell.value,
          mode: stockDefaults.costs.orderCostSell.mode as 'currency' | 'percent',
          allowModeChange: stockDefaults.costs.orderCostSell.allowModeChange,
          label: stockDefaults.costs.orderCostSell.i18nKey,
        },
        depotCostsYearly: {
          enabled: existingStock?.depotCostsYearly
            ? D(existingStock.depotCostsYearly).gt(0)
            : stockDefaults.costs.depotCostsYearly.enabled,
          value: existingStock?.depotCostsYearly || stockDefaults.costs.depotCostsYearly.value,
          mode: stockDefaults.costs.depotCostsYearly.mode as 'currency' | 'percent',
          allowModeChange: stockDefaults.costs.depotCostsYearly.allowModeChange,
          label: stockDefaults.costs.depotCostsYearly.i18nKey,
        },
      }),
      [existingStock, stockDefaults.costs],
    );

    // State for Costs
    const [runningCosts, setRunningCosts] = React.useState<CostState>(initialRunningCosts);

    // Memoize the initial tax deductions state
    const initialTaxDeductions = React.useMemo<CostState>(
      () => ({
        withholdingTax: {
          // Maps to Capital Gains Tax (25%)
          enabled: true,
          value: String(
            existingStock?.capitalGainsTaxRate || stockDefaults.taxes.capitalGainsTaxRate,
          ),
          mode: 'percent' as 'currency' | 'percent',
          allowModeChange: false,
          label: 'stockForm.taxes.capitalGainsTax', // Store key
        },
        solidaritySurcharge: {
          enabled: true,
          value: String(
            existingStock?.solidaritySurchargeRate || stockDefaults.taxes.solidaritySurchargeRate,
          ),
          mode: 'percent' as 'currency' | 'percent',
          allowModeChange: false,
          label: 'stockForm.taxes.solidaritySurcharge',
        },
        churchTax: {
          enabled: existingStock?.churchTaxRate
            ? existingStock.churchTaxRate > 0
            : stockDefaults.taxes.churchTaxRate > 0,
          value: String(existingStock?.churchTaxRate || stockDefaults.taxes.churchTaxRate),
          mode: 'percent' as 'currency' | 'percent',
          allowModeChange: true,
          label: 'stockForm.taxes.churchTax',
        },
      }),
      [existingStock, stockDefaults.taxes],
    );

    // State for Taxes (using structure from DepositForm/TaxDeductionsAccordion)
    const [taxDeductions, setTaxDeductions] = React.useState<CostState>(initialTaxDeductions);

    // State for Dividends
    const [sDividendPerShare, setSDividendPerShare] = React.useState(
      D(initDividendPerShare).toFixed(2),
    );

    // State for Exit
    const [sExpectedSellPrice, setSExpectedSellPrice] = React.useState(
      existingStock?.expectedSellPrice || stockDefaults.basic.startAmount,
    );
    const [sSellingCosts, setSSellingCosts] = React.useState(
      existingStock?.sellingCosts || stockDefaults.exit.sellingCosts,
    );

    // State for Tax Free Allowance and the calculated total annual tax
    const [sTaxFreeAllowance, setSTaxFreeAllowance] = React.useState(
      existingStock?.taxFreeAllowance
        ? D(existingStock.taxFreeAllowance).toFixed(0)
        : String(stockDefaults.taxes.taxFreeAllowance),
    );
    const [totalAnnualTaxD, setTotalAnnualTaxD] = React.useState(D(0));

    // Input touch states for validation
    const [isNameTouched, setIsNameTouched] = React.useState(false);
    const [isPriceTouched, setIsPriceTouched] = React.useState(false);
    const [isSharesTouched, setIsSharesTouched] = React.useState(false);

    // Calculations
    const purchasePriceD = D(normalize(sPurchasePrice));
    const numberOfSharesD = D(normalize(sNumberOfShares));
    const currentPriceD = D(normalize(sCurrentPrice));
    const expectedPriceD = D(normalize(sExpectedPrice));
    const dividendPerShareD = D(normalize(sDividendPerShare));
    const expectedSellPriceD = D(normalize(sExpectedSellPrice));
    const sellingCostsD = D(normalize(sSellingCosts));

    // Base/Total Investment Amount
    const totalInvestmentD = purchasePriceD.mul(numberOfSharesD);

    // Annual Gross Dividend
    const annualGrossDividendD = numberOfSharesD.mul(dividendPerShareD);

    // Annual Running Costs
    const yearlyDepotCostsD = D(
      normalize(runningCosts.depotCostsYearly.enabled ? runningCosts.depotCostsYearly.value : '0'),
    );
    const totalRunningCostsAnnualD = yearlyDepotCostsD;

    // Tax Base (for TaxDeductionsAccordion) is the annual gross dividend
    const grossAnnualGainForTax = annualGrossDividendD;

    // Annual Net Gain = Gross Dividend - Annual Tax - Annual Depot Costs
    const netGainYearlyD = annualGrossDividendD.sub(totalAnnualTaxD).sub(totalRunningCostsAnnualD);
    const netGainMonthlyD = netGainYearlyD.div(12);

    const yieldPct = totalInvestmentD.gt(0)
      ? netGainYearlyD.div(totalInvestmentD).mul(100).toDP(2).toString()
      : '0';

    // Total Order Costs (One-off transaction costs)
    const orderCostBuyD = D(
      normalize(runningCosts.orderCostBuy.enabled ? runningCosts.orderCostBuy.value : '0'),
    );
    const orderCostSellD = D(
      normalize(runningCosts.orderCostSell.enabled ? runningCosts.orderCostSell.value : '0'),
    );
    const totalOrderCostsBuy = orderCostBuyD;
    const totalOrderCostsSell = orderCostSellD;

    // Total Sale Proceeds Calculation (Exit)
    const grossSaleProceedsD = expectedSellPriceD.mul(numberOfSharesD);
    const netSaleProceedsD = grossSaleProceedsD.sub(sellingCostsD);

    // Validation
    const trimmedName = sName.trim();
    const purchasePriceError = purchasePriceD.lte(0);
    const sharesError = numberOfSharesD.lte(0);
    const nameError = !trimmedName || existingNames.includes(trimmedName);

    const nameHelperText = !trimmedName
      ? t('stockForm.nameHelperEmpty')
      : existingNames.includes(trimmedName)
        ? t('stockForm.nameHelperInUse')
        : '';
    const purchasePriceHelperText =
      isPriceTouched && purchasePriceError ? t('stockForm.purchasePriceHelper') : '';
    const sharesHelperText = isSharesTouched && sharesError ? t('stockForm.sharesHelper') : '';

    const handleRunningCostChange = (key: string, newValues: Partial<CostState[string]>) => {
      setRunningCosts((prev) => ({ ...prev, [key]: { ...prev[key], ...newValues } }));
    };
    const handleTaxDeductionsChange = (key: string, newValues: Partial<CostState[string]>) => {
      setTaxDeductions((prev) => ({ ...prev, [key]: { ...prev[key], ...newValues } }));
    };

    const handleCopyPurchasePrice =
      (setter: React.Dispatch<React.SetStateAction<string>>) => () => {
        setter(sPurchasePrice);
      };

    // Expose submit function
    React.useImperativeHandle(ref, () => ({
      submit: () => {
        setIsNameTouched(true);
        setIsPriceTouched(true);
        setIsSharesTouched(true);

        if (purchasePriceError || sharesError || nameError) {
          return;
        }

        const cgTaxRate = taxDeductions.withholdingTax.enabled
          ? D(taxDeductions.withholdingTax.value).toNumber()
          : 0;
        const soliRate = taxDeductions.solidaritySurcharge.enabled
          ? D(taxDeductions.solidaritySurcharge.value).toNumber()
          : 0;
        const churchRate = taxDeductions.churchTax?.enabled
          ? D(taxDeductions.churchTax.value).toNumber()
          : undefined;

        const investmentData: StockInvestment = {
          id: editId || `stk_${Date.now()}`,
          name: trimmedName,
          link: sLink.trim(),
          kind: 'STOCK',
          currency: sCurrency,
          startAmount: purchasePriceD.toFixed(2), // Price per share
          totalPrice: totalInvestmentD.toFixed(2), // Total Investment

          // Stock specific
          isinWkn: sIsinWkn.trim(),
          numberOfShares: numberOfSharesD.toNumber(),
          currentPrice: currentPriceD.toFixed(2),
          expectedPrice: expectedPriceD.toFixed(2),
          dividendPerShare: dividendPerShareD.toFixed(2),

          orderCostBuy: totalOrderCostsBuy.toFixed(2),
          orderCostSell: totalOrderCostsSell.toFixed(2),
          depotCostsYearly: yearlyDepotCostsD.toFixed(2),

          // Taxes
          capitalGainsTaxRate: cgTaxRate,
          solidaritySurchargeRate: soliRate,
          churchTaxRate: churchRate,
          taxFreeAllowance: D(normalize(sTaxFreeAllowance)).toFixed(2),
          incomeTaxRate: cgTaxRate,

          // Exit/Sale
          expectedSellPrice: expectedSellPriceD.toFixed(2),
          sellingCosts: sellingCostsD.toFixed(2),

          // Outputs
          annualGrossDividend: annualGrossDividendD.toFixed(2),
          totalOrderCostsBuy: totalOrderCostsBuy.toFixed(2),
          totalOrderCostsSell: totalOrderCostsSell.toFixed(2),
          totalTaxAnnual: totalAnnualTaxD.toFixed(2),
          netGainMonthly: netGainMonthlyD.toFixed(2),
          netGainYearly: netGainYearlyD.toFixed(2),
          returnPercent: yieldPct.toString(),
        };

        if (editId) {
          updateStock(investmentData);
        } else {
          addStock(investmentData);
        }

        onClose();
      },
      isValid: () => !purchasePriceError && !sharesError && !nameError,
    }));

    return (
      <Stack spacing={3} sx={{ mt: 1 }}>
        {/* --- Basic Information --- */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <TextField
            label={t('stockForm.nameLabel')}
            value={sName}
            onChange={(e) => setSName(e.target.value)}
            onBlur={() => setIsNameTouched(true)}
            error={isNameTouched && nameError}
            helperText={isNameTouched && nameHelperText}
            fullWidth
            required
          />
          <TextField
            label={t('stockForm.isinWknLabel')}
            value={sIsinWkn}
            onChange={(e) => setSIsinWkn(e.target.value)}
            fullWidth
            disabled
          />
        </Box>
        <TextField
          label={t('stockForm.linkLabel')}
          value={sLink}
          onChange={(e) => setSLink(e.target.value)}
          placeholder={t('stockForm.linkPlaceholder')}
          fullWidth
        />
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <PriceInput
            label={t('stockForm.purchasePriceLabel')}
            value={sPurchasePrice}
            onChange={(e) => setSPurchasePrice(sanitizeDecimal(e.target.value))}
            onBlur={() => setIsPriceTouched(true)}
            error={isPriceTouched && purchasePriceError}
            helperText={purchasePriceHelperText}
          />
          <TextField
            label={t('stockForm.sharesLabel')}
            type="text"
            inputProps={{ inputMode: 'numeric' }}
            value={sNumberOfShares}
            onChange={(e) => setSNumberOfShares(sanitizeDecimal(e.target.value))}
            onBlur={() => setIsSharesTouched(true)}
            error={isSharesTouched && sharesError}
            helperText={sharesHelperText}
            fullWidth
            required
          />
          <CurrencySelect value={sCurrency} onChange={(e) => setSCurrency(e.target.value)} />
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label={t('stockForm.currentPriceLabel')}
            value={sCurrentPrice}
            onChange={(e) => setSCurrentPrice(sanitizeDecimal(e.target.value))}
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Typography sx={{ mr: 1 }}>{sCurrency}</Typography>
                  <IconButton
                    onClick={handleCopyPurchasePrice(setSCurrentPrice)}
                    size="small"
                    edge="end"
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label={t('stockForm.expectedPriceLabel')}
            value={sExpectedPrice}
            onChange={(e) => setSExpectedPrice(sanitizeDecimal(e.target.value))}
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Typography sx={{ mr: 1 }}>{sCurrency}</Typography>
                  <IconButton
                    onClick={handleCopyPurchasePrice(setSExpectedPrice)}
                    size="small"
                    edge="end"
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Divider />

        {/* --- Revenue (Dividends) --- */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={700}>{t('stockForm.accordions.revenue')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <TextField
                label={t('stockForm.dividendPerShareLabel')}
                type="text"
                inputProps={{ inputMode: 'decimal' }}
                value={sDividendPerShare}
                onChange={(e) => setSDividendPerShare(sanitizeDecimal(e.target.value))}
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Typography>{sCurrency}</Typography>
                    </InputAdornment>
                  ),
                }}
              />
              <ResultRow
                label={t('stockForm.annualGrossDividendLabel')}
                value={`${fmtMoney(annualGrossDividendD.toString())} ${sCurrency}`}
              />
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* --- Running Costs --- */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={700}>{t('stockForm.accordions.runningCosts')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              {Object.entries(runningCosts).map(([key, item]) => (
                <CostInputRow
                  key={key}
                  // Translate label here from the stored i18n key
                  item={{ ...item, label: t(item.label) }}
                  onItemChange={(v) => handleRunningCostChange(key, v)}
                  baseAmount={totalInvestmentD} // Using total investment as base for percentage display
                  currency={sCurrency}
                />
              ))}
              <ResultRow
                label={t('stockForm.annualRunningCostsLabel')}
                value={`${fmtMoney(totalRunningCostsAnnualD.toString())} ${sCurrency}`}
              />
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* --- Taxes (Using TaxDeductionsAccordion) --- */}
        <TaxDeductionsAccordion
          taxDeductions={taxDeductions}
          onTaxDeductionsChange={handleTaxDeductionsChange}
          taxFreeAllowance={sTaxFreeAllowance}
          onTaxFreeAllowanceChange={setSTaxFreeAllowance}
          grossAnnualGain={grossAnnualGainForTax}
          currency={sCurrency}
          onTotalAnnualTaxChange={setTotalAnnualTaxD}
        />

        {/* --- Exit / Sale --- */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={700}>{t('stockForm.accordions.sale')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <TextField
                label={t('stockForm.expectedSellPriceLabel')}
                value={sExpectedSellPrice}
                onChange={(e) => setSExpectedSellPrice(sanitizeDecimal(e.target.value))}
                fullWidth
                InputProps={{
                  endAdornment: <InputAdornment position="end">{sCurrency}</InputAdornment>,
                }}
              />
              <TextField
                label={t('stockForm.sellingCostsLabel')}
                value={sSellingCosts}
                onChange={(e) => setSSellingCosts(sanitizeDecimal(e.target.value))}
                fullWidth
                InputProps={{
                  endAdornment: <InputAdornment position="end">{sCurrency}</InputAdornment>,
                }}
              />
              <Divider />
              <ResultRow
                label={t('stockForm.netSaleProceedsLabel')}
                value={`${fmtMoney(netSaleProceedsD.toString())} ${sCurrency}`}
                isBold
              />
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Divider />
        <Stack
          spacing={1}
          sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
        >
          <Typography variant="h6">{t('stockForm.summary.title')}</Typography>
          <ResultRow
            label={t('stockForm.summary.totalInvestmentLabel')}
            value={`${fmtMoney(totalInvestmentD.toString())} ${sCurrency}`}
          />
          <ResultRow
            label={t('stockForm.summary.annualNetGainLabel')}
            value={`${fmtMoney(netGainYearlyD.toString())} ${sCurrency}`}
          />
          <ResultRow
            label={t('stockForm.summary.monthlyNetGainLabel')}
            value={`${fmtMoney(netGainMonthlyD.toString())} ${sCurrency}`}
          />
          <ResultRow label={t('stockForm.summary.netYieldLabel')} value={`${yieldPct} %`} isBold />
        </Stack>
      </Stack>
    );
  },
);

export default StockForm;
// --- END OF FILE StockForm.tsx ---
