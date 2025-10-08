import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next'; // <-- CHANGED: Import i18n hook

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

// <-- CHANGED: Type definition now matches your new JSON structure
type DefaultItem = {
  label: string;
  enabled: boolean;
  value: number | string;
  mode: 'percent' | 'currency';
  allowModeChange: boolean;
};
type DefaultsConfig = typeof deDefaultValues;

const allDefaults: Record<string, DefaultsConfig> = {
  de: deDefaultValues,
  cz: czDefaultValues,
  ch: chDefaultValues,
};

// --- Helper Functions ---
// <-- CHANGED: Rewritten to work with the new JSON format { value, mode }
const getDisplayValue = (item: DefaultItem, currency: string): string => {
  if (item.mode === 'percent') {
    return `${(Number(item.value) * 100).toFixed(2)} %`;
  }
  if (item.mode === 'currency') {
    return `${Number(item.value).toLocaleString('de-DE')} ${currency}`;
  }
  return String(item.value) || 'N/A';
};

const DataSection = ({
  title,
  data,
  currency,
  isEditable,
}: {
  title: string;
  data: Record<string, DefaultItem>; // <-- CHANGED: Typed data
  currency: string;
  isEditable: boolean;
}) => {
  const { t } = useTranslation(); // <-- CHANGED: Use translation for table headers

  if (!data || Object.keys(data).length === 0) {
    return null;
  }

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('optionsMenu.description')}</TableCell>
              <TableCell align="right">{t('optionsMenu.defaultValue')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(data).map(([key, item]) => (
              <TableRow key={key}>
                <TableCell component="th" scope="row">
                  {/* <-- CHANGED: Using item.label directly from the JSON, as you requested */}
                  {item.label}
                </TableCell>
                <TableCell align="right">
                  {isEditable ? (
                    <TextField
                      variant="outlined"
                      size="small"
                      defaultValue={getDisplayValue(item, currency)}
                      sx={{ width: '120px' }}
                      // Add onBlur or onChange handlers here to update state
                    />
                  ) : (
                    getDisplayValue(item, currency)
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

// --- Main OptionsMenu Component ---
export default function OptionsMenu() {
  const { t, i18n } = useTranslation(); // <-- CHANGED: Initialize i18n

  // <-- Data for dropdowns is now driven by i18n for labels
  const countryOptions = useMemo(
    () => [
      { value: 'de', label: t('countries.de') },
      { value: 'cz', label: t('countries.cz') },
      { value: 'ch', label: t('countries.ch') },
      { value: 'custom', label: t('countries.custom') },
    ],
    [t],
  );

  const languageOptions = useMemo(
    () => [
      { value: 'de', label: t('languages.de') },
      { value: 'en', label: t('languages.en') },
      { value: 'cz', label: t('languages.cz') },
    ],
    [t],
  );

  const currencyOptions = [
    { value: 'EUR', label: 'Euro (EUR)' },
    { value: 'CZK', label: 'Czech Koruna (CZK)' },
    { value: 'CHF', label: 'Swiss Franc (CHF)' },
  ];

  // State
  const [mainCurrency, setMainCurrency] = useState('EUR');
  const [selectedCountry, setSelectedCountry] = useState('de');
  const [currentDefaults, setCurrentDefaults] = useState<DefaultsConfig>(deDefaultValues);
  const [exchangeRates, setExchangeRates] = useState({ CZK: 24.75, CHF: 0.98 });

  const isCustomProfile = selectedCountry === 'custom';

  useEffect(() => {
    if (selectedCountry !== 'custom') {
      setCurrentDefaults(allDefaults[selectedCountry]);
    } else {
      setCurrentDefaults(JSON.parse(JSON.stringify(deDefaultValues)));
    }
  }, [selectedCountry]);

  // <-- CHANGED: Function to handle language change
  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const handleReset = () => {
    // This only resets the editable values, not the language/country selections
    setSelectedCountry('de'); // This will trigger the useEffect
    setExchangeRates({ CZK: 24.75, CHF: 0.98 });
    // To reset to a custom state, you could do this instead:
    // setSelectedCountry('custom');
  };

  const selectedCountryLabel = useMemo(
    () => countryOptions.find((c) => c.value === selectedCountry)?.label,
    [selectedCountry, countryOptions],
  );

  // <-- CHANGED: Destructuring based on your new JSON format
  const { meta, investments } = currentDefaults;
  const purchaseCosts = investments?.realEstate?.purchaseCosts;

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('optionsMenu.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          {t('optionsMenu.description')}
        </Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                {t('optionsMenu.coreSettings')}
              </Typography>
              <Box component="form" noValidate autoComplete="off">
                <FormControl fullWidth sx={{ mb: 2.5 }}>
                  <InputLabel id="language-select-label">{t('optionsMenu.language')}</InputLabel>
                  <Select
                    labelId="language-select-label"
                    value={i18n.language}
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
                {/* Currency and Default Values dropdowns remain the same */}
                <FormControl fullWidth sx={{ mb: 2.5 }}>
                  <InputLabel id="currency-select-label">
                    {t('optionsMenu.mainCurrency')}
                  </InputLabel>
                  <Select
                    labelId="currency-select-label"
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
                  <InputLabel id="defaults-select-label">
                    {t('optionsMenu.defaultValues')}
                  </InputLabel>
                  <Select
                    labelId="defaults-select-label"
                    value={selectedCountry}
                    label={t('optionsMenu.defaultValues')}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                  >
                    {countryOptions.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Paper>
          </Grid>
          {/* Column 2: Exchange Rates */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Exchange Rates (Base: 1 EUR)
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

        {/* --- DEFAULTS DISPLAY --- */}
        {meta &&
          purchaseCosts && ( // <-- CHANGED: Added a check to prevent errors if data is missing
            <Box>
              <Typography variant="h5" component="h2" gutterBottom>
                {t('optionsMenu.defaultsFor')} <strong>{selectedCountryLabel}</strong>
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Paper variant="outlined" sx={{ px: 1.5, py: 0.5 }}>
                  <Typography variant="body2">
                    {t('optionsMenu.country')}: <strong>{meta.country}</strong>
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ px: 1.5, py: 0.5 }}>
                  <Typography variant="body2">
                    {t('optionsMenu.currency')}: <strong>{meta.currency}</strong>
                  </Typography>
                </Paper>
              </Box>
              {isCustomProfile && (
                <Typography variant="body2" color="primary" sx={{ fontStyle: 'italic', mb: 2 }}>
                  {t('optionsMenu.customProfileInfo')}
                </Typography>
              )}

              <DataSection
                title={t('optionsMenu.purchaseCosts')}
                data={{ ...purchaseCosts.basicCosts, ...purchaseCosts.additionalCosts }}
                currency={meta.currency}
                isEditable={isCustomProfile}
              />
              {/* You can add other DataSection instances here for running costs etc. when you add them to the JSON */}
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
