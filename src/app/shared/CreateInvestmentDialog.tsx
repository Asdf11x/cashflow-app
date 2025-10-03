import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Stack,
  Typography,
  InputAdornment,
  Tabs,
  Tab,
  Divider,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ToggleButtonGroup,
  ToggleButton,
  Select,
  MenuItem,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Decimal from 'decimal.js';
// import { useInvestStore } from '../../core/state/useInvestStore';

import type { Money } from '../../core/domain/types';
import { fmtMoney } from '../../core/domain/calc';
import { getDefaultCostsConfig } from '../../config';
import type { RealEstateCostsConfig } from '../../config/costs';

// --- Type Definitions ---
type CostItemState = {
  enabled: boolean;
  value: string;
  mode: 'percent' | 'currency';
  allowModeChange: boolean;
  label: string;
};

type CostState = Record<string, CostItemState>;


// --- Helper Functions ---
const D = (v: Money | number | string) => new Decimal(v || '0');
const normalize = (v: string) => (v ?? '').toString().replace(/\s/g, '').replace(',', '.');
const cfgToPctStr = (v: number) => new Decimal(v * 100).toDP(2).toString();
const pctToFrac = (s: string) => D(normalize(s)).div(100);

// ============================================================================
// --- 1. Reusable Input Component: CostInputRow ---
// ============================================================================
interface CostInputRowProps {
  item: CostItemState;
  onItemChange: (newItem: Partial<CostItemState>) => void;
  baseAmount: Decimal;
  currency: string;
}

function CostInputRow({ item, onItemChange, baseAmount, currency }: CostInputRowProps) {
  const { enabled, value, mode, allowModeChange, label } = item;

  const absoluteAmount = React.useMemo(() => {
    if (mode === 'percent') {
      return baseAmount.mul(pctToFrac(value));
    }
    return D(normalize(value));
  }, [value, mode, baseAmount]);

  const handleModeChange = (_: any, newMode: 'percent' | 'currency' | null) => {
    if (newMode) {
      // Convert value when switching mode
      const currentValue = absoluteAmount;
      let nextValue = '0';
      if (newMode === 'percent') {
        nextValue = baseAmount.gt(0) ? currentValue.div(baseAmount).mul(100).toDP(2).toString() : '0';
      } else {
        nextValue = currentValue.toDP(0).toString();
      }
      onItemChange({ mode: newMode, value: nextValue });
    }
  };

  const isPercent = mode === 'percent';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
      <Checkbox checked={enabled} onChange={(e) => onItemChange({ enabled: e.target.checked })} />
      <TextField
        label={label}
        value={value}
        onChange={(e) => onItemChange({ value: e.target.value })}
        disabled={!enabled}
        type="text"
        inputMode="decimal"
        fullWidth
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" color={enabled ? "text.primary" : "text.disabled"}>{isPercent ? '%' : currency}</Typography>
                {isPercent && <Typography variant="caption" color="text.secondary">(= {fmtMoney(absoluteAmount.toString())})</Typography>}
              </Stack>
            </InputAdornment>
          ),
        }}
      />
      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={handleModeChange}
        size="small"
        disabled={!enabled || !allowModeChange}
      >
        <ToggleButton value="currency">{currency}</ToggleButton>
        <ToggleButton value="percent">%</ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}

// ============================================================================
// --- 2. Reusable Section Component: CostSectionAccordion ---
// ============================================================================
interface CostSectionAccordionProps {
  title: string;
  costs: CostState;
  onCostChange: (key: string, newValues: Partial<CostItemState>) => void;
  baseAmount: Decimal;
  currency: string;
  total: Decimal;
}

function CostSectionAccordion({ title, costs, onCostChange, baseAmount, currency, total }: CostSectionAccordionProps) {
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

// ============================================================================
// --- 3. Details Component ---
// ============================================================================
function DetailsAccordion() {
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

// ============================================================================
// --- Main Dialog Component ---
// ============================================================================
export default function CreateInvestmentDialog({ onClose }: { onClose: () => void }) {
  // const addObjectRaw = useInvestStore((s) => s.addObjectRaw);
  // const addRealEstateRaw = useInvestStore((s) => s.addRealEstateRaw);

  const cfg: RealEstateCostsConfig = getDefaultCostsConfig();

  const [tab, setTab] = React.useState<'REAL_ESTATE' | 'OBJECT'>('REAL_ESTATE');

  /* -------- Objekt (simple) - State unchanged -------- */
  // const [oName, setOName] = React.useState('Objekt A');
  // const [oPurchasePrice, setOPurchasePrice] = React.useState('100000');
  // const [oGrossGainMonthly, setOGrossGainMonthly] = React.useState('1200');
  // const [oCostMonthly, setOCostMonthly] = React.useState('300');

  /* -------- Immobilie - NEW STRUCTURED STATE -------- */
  const [rName, setRName] = React.useState('Immobilie A');
  const [rPurchasePrice, setRPurchasePrice] = React.useState('350000');
  const [rCurrency, setRCurrency] = React.useState('€');
  const rPurchasePriceD = D(normalize(rPurchasePrice));

  const [purchaseCosts, setPurchaseCosts] = React.useState<CostState>({
    brokerCommission: { enabled: true, value: cfgToPctStr(cfg.purchaseCosts.basicCosts.brokerCommission.rateOfPurchasePrice), mode: 'percent', allowModeChange: false, label: "Maklerprovision" },
    propertyTransferTax: { enabled: true, value: cfgToPctStr(cfg.purchaseCosts.basicCosts.propertyTransferTax.rateOfPurchasePrice), mode: 'percent', allowModeChange: false, label: "Grunderwerbsteuer" },
    notaryFees: { enabled: true, value: cfgToPctStr(cfg.purchaseCosts.basicCosts.notaryFees.rateOfPurchasePrice), mode: 'percent', allowModeChange: false, label: "Notarkosten" },
    landRegistryFees: { enabled: true, value: cfgToPctStr(cfg.purchaseCosts.basicCosts.landRegistryFees.rateOfPurchasePrice), mode: 'percent', allowModeChange: false, label: "Grundbucheintrag" },
  });

  const [additionalCosts, setAdditionalCosts] = React.useState<CostState>({
    renovationCosts: { enabled: false, value: '0', mode: 'currency', allowModeChange: true, label: "Renovierungskosten"},
    subvention: { enabled: false, value: '0', mode: 'currency', allowModeChange: true, label: "Subvention (z.B. Förderung)"},
    otherAdditionalCosts: { enabled: false, value: '0', mode: 'percent', allowModeChange: true, label: "Zusätzliche Kosten"},
    appraisalFee: { enabled: false, value: cfgToPctStr(cfg.purchaseCosts.additionalCosts.appraisalFee.rateOfPurchasePrice), mode: 'percent', allowModeChange: true, label: "Gutachterkosten" },
    insuranceSetup: { enabled: false, value: cfgToPctStr(cfg.purchaseCosts.additionalCosts.insuranceSetup.rateOfPurchasePrice), mode: 'percent', allowModeChange: true, label: "Versicherungs-Setup" },
  });

  const [rMonthlyColdRent, setRMonthlyColdRent] = React.useState('1200');
  const rAnnualColdRentD = D(normalize(rMonthlyColdRent)).mul(12);

  const [deductions, setDeductions] = React.useState<CostState>({
    incomeTax: { enabled: true, value: cfgToPctStr(cfg.rent.taxes.incomeTax.rate), mode: 'percent', allowModeChange: false, label: "Einkommensteuer" },
    solidaritySurcharge: { enabled: true, value: cfgToPctStr(cfg.rent.taxes.solidaritySurcharge.rate), mode: 'percent', allowModeChange: false, label: "Solidaritätszuschlag" },
    churchTax: { enabled: false, value: cfgToPctStr(cfg.rent.taxes.churchTax.rate), mode: 'percent', allowModeChange: false, label: "Kirchensteuer" },
    otherDeductions: { enabled: false, value: '0', mode: 'currency', allowModeChange: true, label: "Zusätzliche Abzüge"},
  });

  // --- Generic State Handlers ---
  const handleCostChange = (setState: React.Dispatch<React.SetStateAction<CostState>>) => (key: string, newValues: Partial<CostItemState>) => {
    setState(prev => ({...prev, [key]: {...prev[key], ...newValues}}));
  };

  // --- Memoized Calculations ---
  const calculateTotal = (costs: CostState, base: Decimal, specialHandlers: Record<string, 'subtract'> = {}): Decimal => {
    return Object.entries(costs).reduce((sum, [key, item]) => {
      if (!item.enabled) return sum;
      const value = item.mode === 'percent' ? base.mul(pctToFrac(item.value)) : D(normalize(item.value));
      if (specialHandlers[key] === 'subtract') {
        return sum.sub(value);
      }
      return sum.add(value);
    }, new Decimal(0));
  };

  const purchaseCostsTotal = React.useMemo(() => calculateTotal(purchaseCosts, rPurchasePriceD), [purchaseCosts, rPurchasePriceD]);
  const additionalCostsTotal = React.useMemo(() => calculateTotal(additionalCosts, rPurchasePriceD, { subvention: 'subtract' }), [additionalCosts, rPurchasePriceD]);

  const deductionsTotalAnnual = React.useMemo(() => {
    // Standard taxes are calculated based on annual rent
    const incomeTaxAmount = deductions.incomeTax.enabled ? rAnnualColdRentD.mul(pctToFrac(deductions.incomeTax.value)) : D(0);
    const soliAmount = deductions.solidaritySurcharge.enabled ? incomeTaxAmount.mul(pctToFrac(deductions.solidaritySurcharge.value)) : D(0);
    const churchTaxAmount = deductions.churchTax.enabled ? incomeTaxAmount.mul(pctToFrac(deductions.churchTax.value)) : D(0);
    const annualTaxes = incomeTaxAmount.add(soliAmount).add(churchTaxAmount);

    // Custom "other" deduction is handled separately
    const other = deductions.otherDeductions;
    let otherDeductionsAnnual = D(0);
    if (other.enabled) {
      if (other.mode === 'currency') {
        // Currency value is monthly, so multiply by 12 for annual total
        otherDeductionsAnnual = D(normalize(other.value)).mul(12);
      } else {
        // Percentage is based on annual rent
        otherDeductionsAnnual = rAnnualColdRentD.mul(pctToFrac(other.value));
      }
    }
    return annualTaxes.add(otherDeductionsAnnual);
  }, [deductions, rAnnualColdRentD]);

  const totalPurchaseSideCosts = purchaseCostsTotal.add(additionalCostsTotal);
  const grandTotalPrice = rPurchasePriceD.add(totalPurchaseSideCosts);
  const netRentAnnual = rAnnualColdRentD.sub(deductionsTotalAnnual);
  const netRentMonthly = netRentAnnual.div(12);
  const yieldPct = grandTotalPrice.gt(0) ? netRentAnnual.div(grandTotalPrice).mul(100).toDP(2).toString() : '0';


  // --- Submit Handlers (simplified for brevity) ---
  const createObject = () => { /* ... existing logic ... */ onClose(); };
  const createRealEstate = () => { /* ... needs to be adapted to the new state structure ... */ onClose(); };

  const purchasePriceError = tab === 'REAL_ESTATE' && rPurchasePriceD.lte(0);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Investment hinzufügen</DialogTitle>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="REAL_ESTATE" label="Immobilie" />
        <Tab value="OBJECT" label="Objekt" />
      </Tabs>

      <DialogContent dividers sx={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
        {tab === 'OBJECT' && ( <Stack spacing={2} sx={{ mt: 1 }}> {/* ... Existing Object Form ... */} </Stack> )}

        {tab === 'REAL_ESTATE' && (
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* --- 1. Top Section --- */}
            <Stack spacing={2}>
              <TextField label="Name" value={rName} onChange={(e) => setRName(e.target.value)} fullWidth />
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <TextField
                  label="Kaufpreis"
                  type="text"
                  inputMode="decimal"
                  value={rPurchasePrice}
                  onChange={(e) => setRPurchasePrice(e.target.value)}
                  error={purchasePriceError}
                  helperText={purchasePriceError ? 'Kaufpreis muss > 0 sein' : ' '}
                  fullWidth
                  required
                  // size="small"
                />
                <Select value={rCurrency} onChange={(e) => setRCurrency(e.target.value)} sx={{minWidth: 100}}>
                  <MenuItem value="€">€ EUR</MenuItem>
                  <MenuItem value="CHF">CHF</MenuItem>
                  <MenuItem value="CZK">CZK</MenuItem>
                </Select>
              </Box>
            </Stack>

            {/* --- 2. Details Accordion --- */}
            <DetailsAccordion />

            {/* --- 3. Purchase Costs Accordion --- */}
            <CostSectionAccordion
              title="Kaufnebenkosten"
              costs={purchaseCosts}
              onCostChange={handleCostChange(setPurchaseCosts)}
              baseAmount={rPurchasePriceD}
              currency={rCurrency}
              total={purchaseCostsTotal}
            />

            {/* --- 4. Additional Costs Accordion --- */}
            <CostSectionAccordion
              title="Zusätzliche Kaufnebenkosten"
              costs={additionalCosts}
              onCostChange={handleCostChange(setAdditionalCosts)}
              baseAmount={rPurchasePriceD}
              currency={rCurrency}
              total={additionalCostsTotal}
            />

            <Divider />

            {/* --- 5. Rent and Deductions --- */}
            <TextField
              label="Monatliche Kaltmiete"
              type="text"
              inputMode="decimal"
              value={rMonthlyColdRent}
              onChange={(e) => setRMonthlyColdRent(e.target.value)}
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
                )
              }}
              fullWidth
            />

            <CostSectionAccordion
              title="Abzüge von Miete (monatlich)"
              costs={deductions}
              onCostChange={handleCostChange(setDeductions)}
              baseAmount={rAnnualColdRentD} // Base for % is still annual rent
              currency={rCurrency}
              total={deductionsTotalAnnual.div(12)} // Display the monthly total
            />

            {/* --- 6. Results Summary --- */}
            <Stack spacing={1} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="h6">Zusammenfassung</Typography>
              <ResultRow label="Gesamtkosten (Neben- & Zusatzkosten)" value={fmtMoney(totalPurchaseSideCosts.toString())} />
              <ResultRow label="Gesamtpreis (inkl. Kaufpreis)" value={fmtMoney(grandTotalPrice.toString())} isBold />
              <Divider sx={{ my: 1 }}/>
              <ResultRow label="Monatliche Nettomiete (nach Abzügen)" value={fmtMoney(netRentMonthly.toString())} />
              <ResultRow label="Jährliche Nettomiete (nach Abzügen)" value={fmtMoney(netRentAnnual.toString())} />
              <ResultRow label="Anfangsrendite p.a." value={`${yieldPct} %`} isBold />
            </Stack>
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Abbrechen</Button>
        {tab === 'OBJECT' ? (
          <Button variant="contained" onClick={createObject}>Erstellen</Button>
        ) : (
          <Button variant="contained" onClick={createRealEstate} disabled={purchasePriceError}>Erstellen</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// Helper for the results section
function ResultRow({ label, value, isBold = false }: { label: string; value: string; isBold?: boolean }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography fontWeight={isBold ? 700 : 400}>{label}</Typography>
      <Typography fontWeight={isBold ? 700 : 400}>{value}</Typography>
    </Box>
  );
}