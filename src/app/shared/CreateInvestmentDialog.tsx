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
  Switch,
  FormControlLabel,
  Collapse,
  Checkbox,
} from '@mui/material';
import Decimal from 'decimal.js';
import { useInvestStore } from '../../core/state/useInvestStore';

import type {
  Money,
  ObjectInvestment,
  RealEstateInvestment,
  RunningCostsSelection,
} from '../../core/domain/types';
import {
  netMonthly,
  netYearly,
  yieldPctYearly,
  fmtMoney,
  fmtNumberTrim,
} from '../../core/domain/calc';
import { getDefaultCostsConfig } from '../../config';
import type { RealEstateCostsConfig } from '../../config/costs';
import { buildRealEstateInvestmentOutput } from '../../core/domain/realEstateCalculator.ts';
// import PercentField from "../components/PercentField.tsx";

type Props = { onClose: () => void };

const D = (v: Money | number | string) => new Decimal(v ?? '0');
const normalize = (v: string) => v.replace(/\s/g, '').replace(',', '.');
const cfgToPctStr = (v: number, decimals = 2) =>
  new Decimal(v.toString()) // <<< IMPORTANT: use string, not number
    .toFixed(decimals) // e.g. "3.50"
    .replace(/\.00$/, '') // "3.5" if .00
    .replace(/(\.\d)0$/, '$1'); // "3.50" -> "3.5"

export default function CreateInvestmentDialog({ onClose }: Props) {
  const addObjectRaw = useInvestStore((s) => s.addObjectRaw);
  const addRealEstateRaw = useInvestStore((s) => s.addRealEstateRaw); // add this to your store

  const cfg: RealEstateCostsConfig = getDefaultCostsConfig();

  const [tab, setTab] = React.useState<'REAL_ESTATE' | 'OBJECT'>('REAL_ESTATE');

  /* -------- Objekt (simple) -------- */
  const [oName, setOName] = React.useState('Objekt A');
  const [oPurchasePrice, setOPurchasePrice] = React.useState('100000');
  const [oGrossGainMonthly, setOGrossGainMonthly] = React.useState('1200');
  const [oCostMonthly, setOCostMonthly] = React.useState('300');

  const oDraft: ObjectInvestment = {
    id: crypto.randomUUID(),
    name: oName,
    kind: 'OBJECT',
    purchasePrice: oPurchasePrice,
    grossGainMonthly: oGrossGainMonthly,
    costMonthly: oCostMonthly,
    netGainMonthly: '0',
    netGainYearly: '0',
    yieldPctYearly: '0',
  };
  const oNetM = netMonthly(oDraft);
  const oNetY = netYearly(oDraft);
  const oYld = yieldPctYearly(oDraft);

  /* -------- Immobilie -------- */
  const [rName, setRName] = React.useState('Immobilie A');
  const [rPurchasePrice, setRPurchasePrice] = React.useState('350000'); // required
  const [rMonthlyColdRent, setRMonthlyColdRent] = React.useState('1200'); // Miete (kalt)
  // Prefill with config defaults (as % *not* fraction for input UX)
  const [rateBroker, setRateBroker] = React.useState(
    cfgToPctStr(cfg.purchaseCosts.basicCosts.brokerCommission.rateOfPurchasePrice * 100).toString(),
  );
  const [rateTransfer, setRateTransfer] = React.useState(
    (cfg.purchaseCosts.basicCosts.propertyTransferTax.rateOfPurchasePrice * 100).toString(),
  );
  const [rateNotary, setRateNotary] = React.useState(
    (cfg.purchaseCosts.basicCosts.notaryFees.rateOfPurchasePrice * 100).toString(),
  );
  const [rateRegistry, setRateRegistry] = React.useState(
    (cfg.purchaseCosts.basicCosts.landRegistryFees.rateOfPurchasePrice * 100).toString(),
  );

  // Optional (default off but with predefined values)
  const [optAppraisalOn, setOptAppraisalOn] = React.useState(false);
  const [rateAppraisal, setRateAppraisal] = React.useState(
    (cfg.purchaseCosts.additionalCosts.appraisalFee.rateOfPurchasePrice * 100).toString(),
  );

  const [optsSetupOn, setOptsSetupOn] = React.useState(false);
  const [rateInsSetup, setRateInsSetup] = React.useState(
    (cfg.purchaseCosts.additionalCosts.insuranceSetup.rateOfPurchasePrice * 100).toString(),
  );
  // purchase section: manual vs standard
  const [useStdPurchase, setUseStdPurchase] = React.useState(true);
  const [manualPurchaseExtra, setManualPurchaseExtra] = React.useState('0'); // if not using std

  // optional standard items (only used when useStdPurchase = true)
  // const [incBroker, setIncBroker] = React.useState(true);
  // const [incAppraisal, setIncAppraisal] = React.useState(true);
  // const [incInsSetup, setIncInsSetup] = React.useState(true);

  // rent tax factors
  const [showRentFactors, setShowRentFactors] = React.useState(true);
  const [applyIncomeTax, setApplyIncomeTax] = React.useState(true);
  const [applySoli, setApplySoli] = React.useState(true);
  const [applyChurch, setApplyChurch] = React.useState(false);

  // nebenkosten / umlagefähig: manual vs standard
  const [useStdApportionable, setUseStdApportionable] = React.useState(true);
  const [useStdNonApportionable, setUseStdNonApportionable] = React.useState(true);
  const [manualApportionableAnnual, setManualApportionableAnnual] = React.useState('0');
  const [manualNonApportionableAnnual, setManualNonApportionableAnnual] = React.useState('0');

  const purchasePriceError =
    tab === 'REAL_ESTATE' && (rPurchasePrice === '' || D(rPurchasePrice).lte(0));

  const pctToFrac = (s: string) => {
    const n = Number((s ?? '0').toString().replace(',', '.'));
    return isFinite(n) ? n / 100 : 0;
  };

  React.useEffect(() => {
    if (!applyIncomeTax) {
      setApplySoli(false);
      setApplyChurch(false);
    }
  }, [applyIncomeTax]);

  // preview: computed purchase costs (std) for the disabled list
  // const stdCostsPreview = React.useMemo(() => {
  //     if (!useStdPurchase) return null;
  //     return calcPurchaseCosts(rPurchasePrice, cfg, {
  //         includeBroker: incBroker,
  //         includeAppraisal: incAppraisal,
  //         includeInsuranceSetup: incInsSetup,
  //     });
  // }, [useStdPurchase, rPurchasePrice, cfg, incBroker, incAppraisal, incInsSetup]);

  const createObject = () => {
    addObjectRaw({
      id: oDraft.id,
      name: oDraft.name,
      kind: 'OBJECT',
      purchasePrice: oPurchasePrice,
      grossGainMonthly: oGrossGainMonthly,
      costMonthly: oCostMonthly,
    });
    onClose();
  };

  const createRealEstate = () => {
    // selection for running costs & tax flags
    const runningSel: RunningCostsSelection = {
      apportionableMode: useStdApportionable
        ? 'percentage'
        : D(manualApportionableAnnual).gt(0)
          ? 'manual'
          : 'none',
      nonApportionableMode: useStdNonApportionable
        ? 'percentage'
        : D(manualNonApportionableAnnual).gt(0)
          ? 'manual'
          : 'none',
      manualApportionableAnnual: manualApportionableAnnual,
      manualNonApportionableAnnual: manualNonApportionableAnnual,
      applyIncomeTax,
      applySolidarity: applySoli,
      applyChurchTax: applyChurch,
    };

    // build base, then compute derived fields
    const base: RealEstateInvestment = {
      id: crypto.randomUUID(),
      name: rName,
      kind: 'REAL_ESTATE',
      purchasePrice: rPurchasePrice,
      monthlyColdRent: rMonthlyColdRent,
      runningCostsSelection: runningSel,

      // outputs placeholders (will be filled by builder)
      netGainMonthly: '0',
      netGainYearly: '0',
      yieldPctYearly: '0',

      // these are filled by builder; keep TS happy:
      appliedPurchaseCosts: {
        propertyTransferTax: '0',
        notaryFees: '0',
        landRegistryFees: '0',
        total: '0',
      } as any,
      annualColdRent: '0',
      incomeTaxAmountAnnual: '0',
      solidarityAnnual: '0',
      churchTaxAnnual: '0',
      netRentAfterTaxAnnual: '0',
      apportionableAnnual: '0',
      nonApportionableAnnual: '0',
      totalRunningCostsAnnual: '0',
    };

    const includeBroker = useStdPurchase; // broker is part of basic set in “standard”
    const includeAppraisal = useStdPurchase && optAppraisalOn;
    const includeInsuranceSetup = useStdPurchase && optsSetupOn;

    const re = buildRealEstateInvestmentOutput(base, cfg, {
      includeBroker,
      includeAppraisal,
      includeInsuranceSetup,
    });

    // If manual purchase extra provided, adjust net/yield by treating it as added investment
    let adjusted = re;
    if (!useStdPurchase && D(manualPurchaseExtra).gt(0)) {
      const totalInvested = D(re.purchasePrice)
        .add(re.appliedPurchaseCosts?.total ?? '0')
        .add(manualPurchaseExtra);
      const netAnnual = new Decimal(re.netGainYearly);
      const yieldPctYearly = totalInvested.gt(0)
        ? netAnnual.div(totalInvested).mul(100).toFixed(2)
        : '0.00';
      adjusted = { ...re, yieldPctYearly };
    }

    addRealEstateRaw(adjusted);
    onClose();
  };

  const rightLabel = (s: string) => (
    <Typography variant="body2" color="text.secondary">
      {s}
    </Typography>
  );

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Investment hinzufügen</DialogTitle>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="fullWidth"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="REAL_ESTATE" label="Immobilie" />
        <Tab value="OBJECT" label="Objekt" />
      </Tabs>

      <DialogContent dividers sx={{ maxHeight: 600, overflow: 'auto' }}>
        {tab === 'OBJECT' && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={oName}
              onChange={(e) => setOName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Kaufpreis"
              type="number"
              value={oPurchasePrice}
              onChange={(e) => setOPurchasePrice(normalize(e.target.value))}
              InputProps={{ endAdornment: <InputAdornment position="end">€</InputAdornment> }}
              fullWidth
            />
            <Box
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}
            >
              <TextField
                label="Gewinn / Monat"
                type="number"
                value={oGrossGainMonthly}
                onChange={(e) => setOGrossGainMonthly(normalize(e.target.value))}
                InputProps={{ endAdornment: <InputAdornment position="end">€</InputAdornment> }}
                fullWidth
              />
              <TextField
                label="Kosten / Monat"
                type="number"
                value={oCostMonthly}
                onChange={(e) => setOCostMonthly(normalize(e.target.value))}
                InputProps={{ endAdornment: <InputAdornment position="end">€</InputAdornment> }}
                fullWidth
              />
            </Box>

            <Box sx={{ mt: 1 }}>
              <Typography fontWeight={700}>Netto monatlich</Typography>
              <Typography>{fmtMoney(oNetM)} €</Typography>
              <Typography fontWeight={700} sx={{ mt: 1 }}>
                Netto jährlich
              </Typography>
              <Typography>{fmtMoney(oNetY)} €</Typography>
              <Typography fontWeight={700} sx={{ mt: 1 }}>
                Rendite p.a.
              </Typography>
              <Typography>{fmtNumberTrim(oYld)} %</Typography>
            </Box>
          </Stack>
        )}

        {tab === 'REAL_ESTATE' && (
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Basic */}
            <Stack spacing={2}>
              <TextField
                label="Name"
                value={rName}
                onChange={(e) => setRName(e.target.value)}
                fullWidth
              />
              <TextField
                label="Kaufpreis"
                type="number"
                value={rPurchasePrice}
                onChange={(e) => setRPurchasePrice(normalize(e.target.value))}
                error={purchasePriceError}
                helperText={purchasePriceError ? 'Kaufpreis muss > 0 sein' : ' '}
                InputProps={{ endAdornment: <InputAdornment position="end">€</InputAdornment> }}
                fullWidth
                required
              />
            </Stack>

            <Divider />

            {/* Purchase costs */}
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography fontWeight={700}>Kaufnebenkosten</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={useStdPurchase}
                      onChange={(e) => setUseStdPurchase(e.target.checked)}
                    />
                  }
                  label={rightLabel('Standard verwenden')}
                />
              </Box>

              {/* STANDARD = itemized + editable */}
              <Collapse in={useStdPurchase} unmountOnExit>
                <Stack spacing={1} sx={{ pl: 1 }}>
                  BASIC (always enabled)
                  <TextField
                    label="Maklergebühr"
                    type="number"
                    value={rateBroker}
                    onChange={(e) => setRateBroker(normalize(e.target.value))}
                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                    fullWidth
                  />
                  {/*<PercentField label="Maklergebühr" value={rateBroker} onChange={setRateBroker} />*/}
                  <TextField
                    label="Grunderwerbsteuer"
                    type="number"
                    value={rateTransfer}
                    onChange={(e) => setRateTransfer(normalize(e.target.value))}
                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                    fullWidth
                  />
                  <TextField
                    label="Notarkosten"
                    type="number"
                    value={rateNotary}
                    onChange={(e) => setRateNotary(normalize(e.target.value))}
                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                    fullWidth
                  />
                  <TextField
                    label="Grundbucheintrag"
                    type="number"
                    value={rateRegistry}
                    onChange={(e) => setRateRegistry(normalize(e.target.value))}
                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                    fullWidth
                  />
                  {/* OPTIONAL (disabled until checked) */}
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={optAppraisalOn}
                        onChange={(e) => setOptAppraisalOn(e.target.checked)}
                      />
                    }
                    label="Gutachterkosten"
                  />
                  <TextField
                    disabled={!optAppraisalOn}
                    type="text"
                    inputMode="decimal"
                    value={rateAppraisal}
                    onChange={(e) => setRateAppraisal(normalize(e.target.value))}
                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                    fullWidth
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={optsSetupOn}
                        onChange={(e) => setOptsSetupOn(e.target.checked)}
                      />
                    }
                    label="Versicherungs-Setup"
                  />
                  <TextField
                    disabled={!optsSetupOn}
                    type="number"
                    value={rateInsSetup}
                    onChange={(e) => setRateInsSetup(normalize(e.target.value))}
                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                    fullWidth
                  />
                  {/* LIVE PREVIEW (Zusätzliche Kosten + Gesamt) */}
                  {(() => {
                    const price = D(rPurchasePrice);
                    const sumPct =
                      pctToFrac(rateBroker) +
                      pctToFrac(rateTransfer) +
                      pctToFrac(rateNotary) +
                      pctToFrac(rateRegistry) +
                      (optAppraisalOn ? pctToFrac(rateAppraisal) : 0) +
                      (optsSetupOn ? pctToFrac(rateInsSetup) : 0);

                    const extra = price.mul(sumPct);
                    const total = price.add(extra);

                    return (
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          Zusätzliche Kosten: {fmtMoney(extra.toFixed(2))} €
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Gesamt: {fmtMoney(total.toFixed(2))} €
                        </Typography>
                      </Box>
                    );
                  })()}
                </Stack>
              </Collapse>

              {/* MANUAL = one amount */}
              <Collapse in={!useStdPurchase} unmountOnExit>
                <TextField
                  label="Zusätzliche Kosten (manuell, gesamt)"
                  type="number"
                  value={manualPurchaseExtra}
                  onChange={(e) => setManualPurchaseExtra(normalize(e.target.value))}
                  InputProps={{ endAdornment: <InputAdornment position="end">€</InputAdornment> }}
                  fullWidth
                />
                {(() => {
                  const price = D(rPurchasePrice);
                  const extra = D(manualPurchaseExtra || '0');
                  const total = price.add(extra);
                  return (
                    <Box sx={{ mt: 0.5, pl: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Zusätzliche Kosten: {fmtMoney(extra.toFixed(2))} €
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Gesamt: {fmtMoney(total.toFixed(2))} €
                      </Typography>
                    </Box>
                  );
                })()}
              </Collapse>
            </Stack>

            <Divider />

            {/* Rent */}
            <Stack spacing={1}>
              <TextField
                label="Miete (Kaltmiete) / Monat"
                type="number"
                value={rMonthlyColdRent}
                onChange={(e) => setRMonthlyColdRent(normalize(e.target.value))}
                InputProps={{ endAdornment: <InputAdornment position="end">€</InputAdornment> }}
                fullWidth
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showRentFactors}
                    onChange={(e) => setShowRentFactors(e.target.checked)}
                  />
                }
                label={rightLabel('Steuer-Faktoren anzeigen')}
              />

              <Collapse in={showRentFactors} unmountOnExit>
                <Stack spacing={0.5} sx={{ pl: 1 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={applyIncomeTax}
                        onChange={(e) => setApplyIncomeTax(e.target.checked)}
                      />
                    }
                    label={`Einkommensteuer: ${(cfg.rent.taxes.incomeTax.rate * 100).toFixed(0)}%`}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={applySoli}
                        onChange={(e) => setApplySoli(e.target.checked)}
                      />
                    }
                    label={`Solidaritätszuschlag: ${(cfg.rent.taxes.solidaritySurcharge.rate * 100).toFixed(1)}% (auf ESt)`}
                    disabled={!applyIncomeTax}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={applyChurch}
                        onChange={(e) => setApplyChurch(e.target.checked)}
                      />
                    }
                    label={`Kirchensteuer: ${(cfg.rent.taxes.churchTax.rate * 100).toFixed(0)}% (auf ESt)`}
                    disabled={!applyIncomeTax}
                  />
                </Stack>
              </Collapse>
            </Stack>

            <Divider />

            {/* LIVE preview for rent */}
            {/*{(() => {*/}
            {/*    const rentMonthly = new Decimal(rMonthlyColdRent || '0');*/}
            {/*    const annual = rentMonthly.mul(12);*/}

            {/*    const est = applyIncomeTax ? annual.mul(cfg.rent.taxes.incomeTax.rate) : new Decimal(0);*/}
            {/*    const soli = applyIncomeTax && applySoli ? est.mul(cfg.rent.taxes.solidaritySurcharge.rate) : new Decimal(0);*/}
            {/*    const church = applyIncomeTax && applyChurch ? est.mul(cfg.rent.taxes.churchTax.rate) : new Decimal(0);*/}

            {/*    const netAfterTax = annual.sub(est).sub(soli).sub(church);*/}

            {/*    return (*/}
            {/*        <Box sx={{ mt: 1, pl: 1 }}>*/}
            {/*            <Typography variant="body2" color="text.secondary">*/}
            {/*                Jahreskaltmiete: {fmtMoney(annual.toFixed(2))} €*/}
            {/*            </Typography>*/}
            {/*            <Typography variant="body2" color="text.secondary">*/}
            {/*                Netto nach Steuer (Jahr): {fmtMoney(netAfterTax.toFixed(2))} €*/}
            {/*            </Typography>*/}
            {/*            <Typography variant="body2" color="text.secondary">*/}
            {/*                Netto nach Steuer (Monat): {fmtMoney(netAfterTax.div(12).toFixed(2))} €*/}
            {/*            </Typography>*/}
            {/*        </Box>*/}
            {/*    );*/}
            {/*})()}*/}

            {/* Nebenkosten blocks */}
            <Stack spacing={2}>
              {/* Umlagefähig */}
              <Box>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Typography fontWeight={700}>Umlagefähige Nebenkosten</Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={useStdApportionable}
                        onChange={(e) => setUseStdApportionable(e.target.checked)}
                      />
                    }
                    label={rightLabel('Standard verwenden')}
                  />
                </Box>
                <Collapse in={!useStdApportionable} unmountOnExit>
                  <TextField
                    label="Manuell (jährlich)"
                    type="number"
                    value={manualApportionableAnnual}
                    onChange={(e) => setManualApportionableAnnual(normalize(e.target.value))}
                    InputProps={{ endAdornment: <InputAdornment position="end">€</InputAdornment> }}
                    fullWidth
                  />
                </Collapse>
                <Collapse in={useStdApportionable} unmountOnExit>
                  <Typography variant="body2" color="text.secondary" sx={{ pl: 1 }}>
                    Standard:{' '}
                    {(
                      cfg.runningCosts.apportionableOperatingCosts.percentageOfAnnualColdRent * 100
                    ).toFixed(0)}
                    % der Jahreskaltmiete
                  </Typography>
                </Collapse>
              </Box>

              {/* Nicht umlagefähig */}
              <Box>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Typography fontWeight={700}>Nicht umlagefähige Nebenkosten</Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={useStdNonApportionable}
                        onChange={(e) => setUseStdNonApportionable(e.target.checked)}
                      />
                    }
                    label={rightLabel('Standard verwenden')}
                  />
                </Box>
                <Collapse in={!useStdNonApportionable} unmountOnExit>
                  <TextField
                    label="Manuell (jährlich)"
                    type="number"
                    value={manualNonApportionableAnnual}
                    onChange={(e) => setManualNonApportionableAnnual(normalize(e.target.value))}
                    InputProps={{ endAdornment: <InputAdornment position="end">€</InputAdornment> }}
                    fullWidth
                  />
                </Collapse>
                <Collapse in={useStdNonApportionable} unmountOnExit>
                  <Typography variant="body2" color="text.secondary" sx={{ pl: 1 }}>
                    Standard:{' '}
                    {(
                      cfg.runningCosts.nonApportionableOperatingCosts.percentageOfAnnualColdRent *
                      100
                    ).toFixed(0)}
                    % der Jahreskaltmiete
                  </Typography>
                </Collapse>
              </Box>
            </Stack>
            {(() => {
              const priceMonthly = new Decimal(rMonthlyColdRent || '0');
              const annual = priceMonthly.mul(12);

              // Taxes (only if ESt checkbox is on)
              const est = applyIncomeTax
                ? annual.mul(cfg.rent.taxes.incomeTax.rate)
                : new Decimal(0);
              const soli =
                applyIncomeTax && applySoli
                  ? est.mul(cfg.rent.taxes.solidaritySurcharge.rate)
                  : new Decimal(0);
              const church =
                applyIncomeTax && applyChurch
                  ? est.mul(cfg.rent.taxes.churchTax.rate)
                  : new Decimal(0);
              const taxesTotal = est.add(soli).add(church);

              const netAfterTax = annual.sub(taxesTotal);

              // Running costs
              const apportionable = useStdApportionable
                ? annual.mul(
                    cfg.runningCosts.apportionableOperatingCosts.percentageOfAnnualColdRent,
                  )
                : new Decimal(manualApportionableAnnual || '0');

              const nonApportionable = useStdNonApportionable
                ? annual.mul(
                    cfg.runningCosts.nonApportionableOperatingCosts.percentageOfAnnualColdRent,
                  )
                : new Decimal(manualNonApportionableAnnual || '0');

              // Final owner net (your v1 model)
              const ownerNetAnnual = netAfterTax.sub(nonApportionable);
              const ownerNetMonthly = ownerNetAnnual.div(12);

              return (
                <Box sx={{ mt: 1, pl: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Jahreskaltmiete: {fmtMoney(annual.toFixed(2))} €
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Steuern gesamt: {fmtMoney(taxesTotal.toFixed(2))} €
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Netto nach Steuer (Jahr): {fmtMoney(netAfterTax.toFixed(2))} €
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Umlagefähige Nebenkosten (Jahr): {fmtMoney(apportionable.toFixed(2))} €
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Nicht umlagefähige Nebenkosten (Jahr): {fmtMoney(nonApportionable.toFixed(2))} €
                  </Typography>
                  <Typography sx={{ mt: 0.5 }}>
                    <b>Netto Eigentümer (Jahr):</b> {fmtMoney(ownerNetAnnual.toFixed(2))} €
                  </Typography>
                  <Typography>
                    <b>Netto Eigentümer (Monat):</b> {fmtMoney(ownerNetMonthly.toFixed(2))} €
                  </Typography>
                </Box>
              );
            })()}
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Abbrechen</Button>
        {tab === 'OBJECT' ? (
          <Button variant="contained" onClick={createObject}>
            Erstellen
          </Button>
        ) : (
          <Button variant="contained" onClick={createRealEstate} disabled={purchasePriceError}>
            Erstellen
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
