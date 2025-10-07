import * as React from 'react';
import {
  Stack,
  TextField,
  Box,
  Divider,
  InputAdornment,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { D, normalize, sanitizeDecimal, pctToFrac, type CostState } from './formHelpers';
import { ResultRow, CurrencySelect, PriceInput } from '../SharedComponents.tsx';
import { fmtMoney } from '../../../core/domain/calc';
import { useInvestStore } from '../../../core/state/useInvestStore.ts';
import { type Depositvestment } from '../../../core/domain/types.ts';
import Decimal from 'decimal.js';
import { getDefaultCostsConfig } from '../../../config';
import { CostInputRow } from './RealEstateForm.tsx';

const DepositForm = React.forwardRef(
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
    const { addDeposit, updateDeposit, deposits } = useInvestStore.getState();
    const existingDeposit = editId ? deposits.find((d) => d.id === editId) : undefined;
    const cfg = getDefaultCostsConfig();

    const [dName, setDName] = React.useState(existingDeposit?.name || 'Festgeld');
    const [dLink, setDLink] = React.useState(existingDeposit?.link || '');
    const [dStartAmount, setDStartAmount] = React.useState(
      existingDeposit?.startAmount ? D(existingDeposit.startAmount).toFixed(0) : '10000',
    );
    const [dCurrency, setDCurrency] = React.useState(existingDeposit?.currency || '€');
    const [dTermMonths, setDTermMonths] = React.useState(
      existingDeposit?.termMonths ? String(existingDeposit.termMonths) : '12',
    );
    const [dRateNominal, setDRateNominal] = React.useState(
      existingDeposit?.rateNominal ? String(existingDeposit.rateNominal) : '3.5',
    );
    const [dCompounding, setDCompounding] = React.useState<Depositvestment['compounding']>(
      existingDeposit?.compounding || 'NONE',
    );
    const [isNameTouched, setIsNameTouched] = React.useState(false);
    const [isPriceTouched, setIsPriceTouched] = React.useState(false);

    // Optional fields
    const [taxEnabled, setTaxEnabled] = React.useState(
      !!existingDeposit?.withholdingTaxRate || !!existingDeposit?.taxFreeAllowance,
    );
    const [dWithholdingTaxRate, setDWithholdingTaxRate] = React.useState(
      existingDeposit?.withholdingTaxRate
        ? String(existingDeposit.withholdingTaxRate)
        : String(cfg.fixedTermDeposit.taxes.withholdingTaxRate),
    );
    const [dTaxFreeAllowance, setDTaxFreeAllowance] = React.useState(
      existingDeposit?.taxFreeAllowance
        ? D(existingDeposit.taxFreeAllowance).toFixed(0)
        : String(cfg.fixedTermDeposit.taxes.taxFreeAllowance),
    );

    const [accountFees, setAccountFees] = React.useState<CostState>({
      yearly: {
        enabled: false,
        value: '0',
        mode: 'currency',
        allowModeChange: true,
        label: 'Kontoführungsgebühren (jährlich)',
      },
    });

    const [oneTimeCosts, setOneTimeCosts] = React.useState<CostState>({
      additional: {
        enabled: false,
        value: '0',
        mode: 'currency',
        allowModeChange: true,
        label: 'Sonstige einmalige Kosten',
      },
    });

    // Calculations
    const startAmountD = D(normalize(dStartAmount));
    const termMonthsN = parseInt(dTermMonths, 10) || 0;
    const termYearsD = termMonthsN > 0 ? D(termMonthsN).div(12) : D(0);
    const rateNominalPctD = D(normalize(dRateNominal));
    const rateNominalFracD = rateNominalPctD.div(100);

    const grossGainD = React.useMemo(() => {
      if (startAmountD.lte(0) || rateNominalFracD.lte(0) || termYearsD.lte(0)) return D(0);

      if (dCompounding === 'NONE') {
        return startAmountD.mul(rateNominalFracD).mul(termYearsD);
      }
      if (dCompounding === 'MONTHLY') {
        const n = 12;
        const nt = D(n).mul(termYearsD);
        const totalAmount = startAmountD.mul(D(1).add(rateNominalFracD.div(n)).pow(nt));
        return totalAmount.sub(startAmountD);
      }
      // Yearly compounding with handling for partial years
      if (dCompounding === 'YEARLY') {
        const fullYears = Math.floor(termMonthsN / 12);
        const remainingMonths = termMonthsN % 12;
        let principal = startAmountD;

        if (fullYears > 0) {
          principal = principal.mul(D(1).add(rateNominalFracD).pow(fullYears));
        }
        if (remainingMonths > 0) {
          const remainingYears = D(remainingMonths).div(12);
          const simpleInterest = principal.mul(rateNominalFracD).mul(remainingYears);
          principal = principal.add(simpleInterest);
        }
        return principal.sub(startAmountD);
      }
      return D(0);
    }, [startAmountD, rateNominalFracD, termYearsD, termMonthsN, dCompounding]);

    const taxAmountD = React.useMemo(() => {
      if (!taxEnabled || grossGainD.lte(0) || termYearsD.lte(0)) return D(0);

      const taxRateD = D(normalize(dWithholdingTaxRate)).div(100);
      const taxFreeAllowanceD = D(normalize(dTaxFreeAllowance));
      const grossGainYearly = grossGainD.div(termYearsD);

      const taxableGainYearly = Decimal.max(grossGainYearly.sub(taxFreeAllowanceD), 0);
      const taxYearly = taxableGainYearly.mul(taxRateD);

      return taxYearly.mul(termYearsD);
    }, [taxEnabled, grossGainD, termYearsD, dWithholdingTaxRate, dTaxFreeAllowance]);

    const calculateTotalCosts = (costs: CostState, base: Decimal): Decimal =>
      Object.values(costs).reduce((sum, item) => {
        if (!item.enabled) return sum;
        const value =
          item.mode === 'percent' ? base.mul(pctToFrac(item.value)) : D(normalize(item.value));
        return sum.add(value);
      }, D(0));

    const totalFeesD = React.useMemo(() => {
      const yearlyFees = calculateTotalCosts(accountFees, startAmountD);
      const totalYearlyFeesOverTerm = yearlyFees.mul(termYearsD);
      const totalOneTimeFees = calculateTotalCosts(oneTimeCosts, startAmountD);
      return totalYearlyFeesOverTerm.add(totalOneTimeFees);
    }, [accountFees, oneTimeCosts, startAmountD, termYearsD]);

    const totalNetGainD = grossGainD.sub(taxAmountD).sub(totalFeesD);
    const netGainYearlyD = termYearsD.gt(0) ? totalNetGainD.div(termYearsD) : D(0);
    const netGainMonthlyD = netGainYearlyD.div(12);
    const yieldPct = startAmountD.gt(0)
      ? netGainYearlyD.div(startAmountD).mul(100).toDP(2).toString()
      : '0';

    // Validation
    const trimmedName = dName.trim();
    const startAmountError = startAmountD.lte(0);
    const nameError = !trimmedName || existingNames.includes(trimmedName);
    const nameHelperText = !trimmedName
      ? 'Name darf nicht leer sein'
      : existingNames.includes(trimmedName)
        ? 'Name bereits vergeben'
        : '';

    React.useImperativeHandle(ref, () => ({
      submit: () => {
        setIsPriceTouched(true);
        setIsNameTouched(true);

        if (startAmountError || nameError) return;

        const investmentData: Depositvestment = {
          id: editId || `dep_${Date.now()}`,
          name: trimmedName,
          link: dLink.trim(),
          kind: 'FIXED_TERM_DEPOSIT',
          currency: dCurrency,
          startAmount: startAmountD.toFixed(2),
          totalPrice: startAmountD.toFixed(2),
          termMonths: termMonthsN,
          rateNominal: rateNominalPctD.toNumber(),
          compounding: dCompounding,
          withholdingTaxRate: taxEnabled ? D(normalize(dWithholdingTaxRate)).toNumber() : undefined,
          taxFreeAllowance: taxEnabled ? D(normalize(dTaxFreeAllowance)).toFixed(2) : undefined,
          feesAccount: totalFeesD.toFixed(2),
          netGainMonthly: netGainMonthlyD.toFixed(2),
          netGainYearly: netGainYearlyD.toFixed(2),
          returnPercent: yieldPct,
        };

        if (editId) {
          updateDeposit(investmentData);
        } else {
          addDeposit(investmentData);
        }

        onClose();
      },
      isValid: () => !startAmountError && !nameError,
    }));

    return (
      <Stack spacing={3} sx={{ mt: 1 }}>
        <TextField
          label="Name"
          value={dName}
          onChange={(e) => setDName(e.target.value)}
          onBlur={() => setIsNameTouched(true)}
          error={isNameTouched && nameError}
          helperText={isNameTouched && nameHelperText}
          fullWidth
          required
        />
        <TextField
          label="Link (optional)"
          value={dLink}
          onChange={(e) => setDLink(e.target.value)}
          placeholder="https://beispiel.de/mein-festgeld"
          fullWidth
        />
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <PriceInput
            label="Anlagebetrag"
            value={dStartAmount}
            onChange={(e) => setDStartAmount(sanitizeDecimal(e.target.value))}
            onBlur={() => setIsPriceTouched(true)}
            error={isPriceTouched && startAmountError}
            helperText={isPriceTouched && startAmountError ? 'Betrag muss > 0 sein' : ' '}
          />
          <CurrencySelect value={dCurrency} onChange={(e) => setDCurrency(e.target.value)} />
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Laufzeit (Monate)"
            type="number"
            value={dTermMonths}
            onChange={(e) => setDTermMonths(e.target.value)}
            fullWidth
          />
          <TextField
            label="Zinssatz p.a."
            type="text"
            inputProps={{ inputMode: 'decimal' }}
            value={dRateNominal}
            onChange={(e) => setDRateNominal(sanitizeDecimal(e.target.value))}
            fullWidth
            InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
          />
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Zinseszins
          </Typography>
          <ToggleButtonGroup
            value={dCompounding}
            exclusive
            fullWidth
            onChange={(_, v) => v && setDCompounding(v)}
          >
            <ToggleButton value="NONE">Keiner</ToggleButton>
            <ToggleButton value="MONTHLY">Monatlich</ToggleButton>
            <ToggleButton value="YEARLY">Jährlich</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={700}>Steuern & Gebühren (optional)</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox checked={taxEnabled} onChange={(e) => setTaxEnabled(e.target.checked)} />
                <Typography>Steuern berücksichtigen</Typography>
              </Box>
              <TextField
                label="Abgeltungssteuer inkl. Soli"
                value={dWithholdingTaxRate}
                onChange={(e) => setDWithholdingTaxRate(sanitizeDecimal(e.target.value))}
                disabled={!taxEnabled}
                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
              />
              <TextField
                label="Sparer-Pauschbetrag (jährlich)"
                value={dTaxFreeAllowance}
                onChange={(e) => setDTaxFreeAllowance(sanitizeDecimal(e.target.value))}
                disabled={!taxEnabled}
                InputProps={{
                  endAdornment: <InputAdornment position="end">{dCurrency}</InputAdornment>,
                }}
              />
              <Divider />
              {Object.entries(accountFees).map(([key, item]) => (
                <CostInputRow
                  key={key}
                  item={item}
                  onItemChange={(v) =>
                    setAccountFees((p) => ({ ...p, [key]: { ...p[key], ...v } }))
                  }
                  baseAmount={startAmountD}
                  currency={dCurrency}
                />
              ))}
              {Object.entries(oneTimeCosts).map(([key, item]) => (
                <CostInputRow
                  key={key}
                  item={item}
                  onItemChange={(v) =>
                    setOneTimeCosts((p) => ({ ...p, [key]: { ...p[key], ...v } }))
                  }
                  baseAmount={startAmountD}
                  currency={dCurrency}
                />
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>
        <Divider />
        <Stack
          spacing={1}
          sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
        >
          <Typography variant="h6">Zusammenfassung</Typography>
          <ResultRow
            label="Zinsertrag (brutto, gesamt)"
            value={`${fmtMoney(grossGainD.toString())} ${dCurrency}`}
          />
          <ResultRow
            label="Abzgl. Steuern & Kosten"
            value={`-${fmtMoney(taxAmountD.add(totalFeesD).toString())} ${dCurrency}`}
          />
          <ResultRow
            label="Gesamtgewinn (netto)"
            value={`${fmtMoney(totalNetGainD.toString())} ${dCurrency}`}
            isBold
          />
          <ResultRow
            label="Jährlicher Gewinn (netto)"
            value={`${fmtMoney(netGainYearlyD.toString())} ${dCurrency}`}
          />
          <ResultRow
            label="Monatlicher Gewinn (netto)"
            value={`${fmtMoney(netGainMonthlyD.toString())} ${dCurrency}`}
          />
          <ResultRow label="Nettorendite p.a." value={`${yieldPct} %`} isBold />
        </Stack>
      </Stack>
    );
  },
);

export default DepositForm;
