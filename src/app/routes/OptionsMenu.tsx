import { useMemo, useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../core/state/useSettingsStore';

import deDefaultValues from '../../config/defaults/de/default-values.json';
import czDefaultValues from '../../config/defaults/cz/default-values.json';
import chDefaultValues from '../../config/defaults/ch/default-values.json';

import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
} from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import { set } from 'lodash';

type DefaultsConfig = typeof deDefaultValues;

const allDefaults: Record<string, DefaultsConfig> = {
  de: deDefaultValues,
  cz: czDefaultValues,
  ch: chDefaultValues,
};

// --- Helper function to parse default values for display ---
const processSectionForDisplay = (sectionData: Record<string, any>, t: (key: string) => string) => {
  const results: any[] = [];
  if (!sectionData) return results;

  for (const [key, item] of Object.entries(sectionData)) {
    // Handle complex items (objects with value, mode, etc.)
    if (typeof item === 'object' && item !== null && 'value' in item) {
      results.push({
        key,
        label: t(item.i18nKey),
        value: item.value,
        mode: item.mode,
      });
    }
    // Handle simple key-value pairs (like in the 'taxes' section)
    else if (typeof item === 'number') {
      results.push({
        key,
        label: t(`optionsMenu.fields.${key}`), // Assumes labels are in translation files
        value: item,
        mode: key.toLowerCase().includes('rate') ? 'percent' : 'currency', // Heuristic for mode
      });
    }
    // Special handling for houseFee with two values
    else if (key === 'houseFee' && 'value1' in item) {
      results.push({
        key: 'houseFeeValue1',
        label: t(item.i18nKeyTotal),
        value: item.value1,
        mode: item.mode,
      });
      results.push({
        key: 'houseFeeValue2',
        label: t(item.i18nKeyApportionable),
        value: item.value2,
        mode: item.mode,
      });
    }
  }
  return results;
};

// --- Display Component for a section of default values ---
const DataSection = ({
  title,
  data,
  currency,
  isEditable,
  onValueChange,
  pathPrefix,
}: {
  title: string;
  data: ReturnType<typeof processSectionForDisplay>;
  currency: string;
  isEditable: boolean;
  onValueChange: (path: string, value: any) => void;
  pathPrefix: string;
}) => {
  if (!data || data.length === 0) {
    return null;
  }

  const getDisplayValue = (item: any) => {
    if (item.mode === 'percent') {
      return `${item.value} %`;
    }
    return `${Number(item.value).toLocaleString('de-DE')} ${
      item.mode === 'currency' ? currency : ''
    }`.trim();
  };

  const handleInputChange = (key: string, newValue: string, mode: string) => {
    let finalValue: string | number = newValue;
    if (mode !== 'text' && mode !== 'percent') {
      finalValue = parseFloat(newValue) || 0;
    }
    const path = `${pathPrefix}.${key}.value`;
    onValueChange(path, finalValue);
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{title}</TableCell>
              <TableCell align="right">Default Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.key}>
                <TableCell component="th" scope="row">
                  {item.label}
                </TableCell>
                <TableCell align="right">
                  {isEditable ? (
                    <TextField
                      variant="outlined"
                      size="small"
                      value={item.value}
                      onChange={(e) => handleInputChange(item.key, e.target.value, item.mode)}
                      sx={{ width: '120px' }}
                      InputProps={{
                        endAdornment: item.mode === 'percent' ? '%' : currency,
                      }}
                    />
                  ) : (
                    getDisplayValue(item)
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default function OptionsMenu() {
  const { t, i18n } = useTranslation();

  const {
    language,
    countryProfile,
    mainCurrency,
    exchangeRates,
    setLanguage,
    setCountryProfile,
    setMainCurrency,
    setExchangeRates,
  } = useSettingsStore();

  const [currentDefaults, setCurrentDefaults] = useState<DefaultsConfig>(
    allDefaults[countryProfile] || deDefaultValues,
  );
  // const [exchangeRates, setExchangeRates] = useState({ CZK: 24.75, CHF: 0.98 });

  const isCustomProfile = countryProfile === 'custom';

  useEffect(() => {
    if (countryProfile !== 'custom') {
      setCurrentDefaults(allDefaults[countryProfile]);
    } else {
      setCurrentDefaults(JSON.parse(JSON.stringify(deDefaultValues)));
    }
  }, [countryProfile]);

  const countryOptions = useMemo(
    () => [
      { value: 'de', label: t('countries.de') },
      // { value: 'cz', label: t('countries.cz') },
      { value: 'ch', label: t('countries.ch') },
      { value: 'custom', label: t('countries.custom') },
    ],
    [t],
  );

  const languageOptions = useMemo(
    () => [
      { value: 'de', label: t('languages.de') },
      { value: 'en', label: t('languages.en') },
      // { value: 'cz', label: t('languages.cz') },
    ],
    [t],
  );

  const currencyOptions = useMemo(
    () => [
      { value: 'NONE', label: t('optionsMenu.noConversion') }, // <-- ADD THIS
      { value: 'EUR', label: 'Euro (EUR)' },
      { value: 'CZK', label: 'Czech Koruna (CZK)' },
      { value: 'CHF', label: 'Swiss Franc (CHF)' },
    ],
    [t],
  );

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  const handleReset = () => {
    setCountryProfile('de');
    setMainCurrency('EUR');
    setExchangeRates({ CZK: 24.75, CHF: 0.98 });
  };

  const handleDefaultsChange = useCallback(
    (path: string, value: any) => {
      if (!isCustomProfile) return;
      setCurrentDefaults((prev) => {
        const newDefaults = JSON.parse(JSON.stringify(prev));
        set(newDefaults, path, value); // using lodash.set for deep updates
        return newDefaults;
      });
    },
    [isCustomProfile],
  );

  const selectedCountryLabel = useMemo(
    () => countryOptions.find((c) => c.value === countryProfile)?.label,
    [countryProfile, countryOptions],
  );

  // Safely destructure data from the current defaults
  const { meta, investments } = currentDefaults;
  const re = investments?.realEstate;
  const ftd = investments?.fixedTermDeposit;

  // Process all sections for display
  const realEstateBasic = processSectionForDisplay(re?.basic, t);
  const purchaseCostsBasic = processSectionForDisplay(re?.purchaseCosts.basic, t);
  const purchaseCostsAdditional = processSectionForDisplay(re?.purchaseCosts.additional, t);
  const runningCostsTaxes = processSectionForDisplay(re?.runningCosts.rentTaxes, t);
  const runningCostsAdditional = processSectionForDisplay(re?.runningCosts.additional, t);
  const depositBasic = processSectionForDisplay(ftd?.basic, t);
  const depositTaxes = processSectionForDisplay(ftd?.taxes, t);

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('optionsMenu.title')}
        </Typography>

        <Grid container spacing={4}>
          {/* Core Settings and Exchange Rates */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                {t('optionsMenu.coreSettings')}
              </Typography>
              <FormControl fullWidth sx={{ mb: 2.5 }}>
                <InputLabel>{t('optionsMenu.language')}</InputLabel>
                <Select
                  value={language}
                  label={t('optionsMenu.language')}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                >
                  {languageOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ mb: 2.5 }}>
                <InputLabel>{t('optionsMenu.mainCurrency')}</InputLabel>
                <Select
                  value={mainCurrency}
                  label={t('optionsMenu.mainCurrency')}
                  onChange={(e) => setMainCurrency(e.target.value)}
                >
                  {currencyOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>{t('optionsMenu.defaultValues')}</InputLabel>
                <Select
                  value={countryProfile}
                  label={t('optionsMenu.defaultValues')}
                  onChange={(e) => setCountryProfile(e.target.value)}
                >
                  {countryOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                {t('optionsMenu.exchangeRates')}
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    {Object.entries(exchangeRates).map(([currency, rate]) => (
                      <TableRow key={currency}>
                        <TableCell sx={{ fontWeight: 'medium', border: 0, pl: 0 }}>
                          {currency}
                        </TableCell>
                        <TableCell align="right" sx={{ border: 0, pr: 0 }}>
                          <TextField
                            type="number"
                            variant="outlined"
                            size="small"
                            value={rate}
                            onChange={(e) =>
                              setExchangeRates({
                                ...exchangeRates,
                                [currency]: parseFloat(e.target.value) || 0,
                              })
                            }
                            inputProps={{ step: '0.01' }}
                            sx={{ width: '100px' }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        {/* Default Values Display Section */}
        {meta && (
          <Box>
            <Typography variant="h5" component="h2" gutterBottom>
              {t('optionsMenu.defaultsFor')} <strong>{selectedCountryLabel}</strong>
            </Typography>
            {isCustomProfile && (
              <Typography variant="body2" color="primary" sx={{ fontStyle: 'italic', mb: 2 }}>
                {t('optionsMenu.customProfileInfo')}
              </Typography>
            )}

            {/* --- Real Estate Section --- */}
            <Typography variant="h5" component="h3" sx={{ mt: 4, mb: 2 }}>
              {t('optionsMenu.realEstate')}
            </Typography>
            <DataSection
              title={t('optionsMenu.realEstateBasic')}
              data={realEstateBasic}
              currency={meta.currency}
              isEditable={isCustomProfile}
              onValueChange={handleDefaultsChange}
              pathPrefix="investments.realEstate.basic"
            />
            <DataSection
              title={t('optionsMenu.purchaseCosts')}
              data={purchaseCostsBasic}
              currency={meta.currency}
              isEditable={isCustomProfile}
              onValueChange={handleDefaultsChange}
              pathPrefix="investments.realEstate.purchaseCosts.basic"
            />
            <DataSection
              title={t('optionsMenu.additionalPurchaseCosts')}
              data={purchaseCostsAdditional}
              currency={meta.currency}
              isEditable={isCustomProfile}
              onValueChange={handleDefaultsChange}
              pathPrefix="investments.realEstate.purchaseCosts.additional"
            />
            <DataSection
              title={t('optionsMenu.taxDeductions')}
              data={runningCostsTaxes}
              currency={meta.currency}
              isEditable={isCustomProfile}
              onValueChange={handleDefaultsChange}
              pathPrefix="investments.realEstate.runningCosts.rentTaxes"
            />
            <DataSection
              title={t('optionsMenu.otherRunningCosts')}
              data={runningCostsAdditional}
              currency={meta.currency}
              isEditable={isCustomProfile}
              onValueChange={handleDefaultsChange}
              pathPrefix="investments.realEstate.runningCosts.additional"
            />

            {/* --- Fixed-Term Deposit Section --- */}
            <Typography variant="h5" component="h3" sx={{ mt: 4, mb: 2 }}>
              {t('optionsMenu.fixedTermDeposit')}
            </Typography>
            <DataSection
              title={t('optionsMenu.depositBasic')}
              data={depositBasic}
              currency={meta.currency}
              isEditable={isCustomProfile}
              onValueChange={handleDefaultsChange}
              pathPrefix="investments.fixedTermDeposit.basic"
            />
            <DataSection
              title={t('optionsMenu.depositTaxes')}
              data={depositTaxes}
              currency={meta.currency}
              isEditable={isCustomProfile}
              onValueChange={handleDefaultsChange}
              pathPrefix="investments.fixedTermDeposit.taxes"
            />
          </Box>
        )}

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<RestoreIcon />}
            onClick={handleReset}
          >
            {t('optionsMenu.resetAll')}
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
