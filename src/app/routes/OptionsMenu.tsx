import { useMemo, useEffect, useState } from 'react';
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

// Define a type for the structure of the default values JSON files
type DefaultsConfig = typeof deDefaultValues;

// Create a record mapping country codes to their default configuration
const allDefaults: Record<string, DefaultsConfig> = {
  de: deDefaultValues,
  cz: czDefaultValues,
  ch: chDefaultValues,
};

// DataSection component displays tables of default values
const DataSection = ({
  title,
  data,
  currency,
  isEditable,
}: {
  title: string;
  data: Record<string, any>;
  currency: string;
  isEditable: boolean;
}) => {
  const { t } = useTranslation();

  if (!data || Object.keys(data).length === 0) {
    return null;
  }

  // Helper function to format the display value based on its type (percent or currency)
  const getDisplayValue = (item: any, currency: string): string => {
    if (item.mode === 'percent' && typeof item.value === 'number') {
      return `${(item.value * 100).toFixed(2)} %`;
    }
    if (item.mode === 'currency') {
      return `${Number(item.value).toLocaleString('de-DE')} ${currency}`;
    }
    return 'N/A';
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
              <TableCell>{t('optionsMenu.description')}</TableCell>
              <TableCell align="right">{t('optionsMenu.defaultValue')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(data).map(([key, item]) => (
              <TableRow key={key}>
                <TableCell component="th" scope="row">
                  {item.label}
                </TableCell>
                <TableCell align="right">
                  {isEditable ? (
                    <TextField
                      variant="outlined"
                      size="small"
                      defaultValue={getDisplayValue(item, currency)}
                      sx={{ width: '120px' }}
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

export default function OptionsMenu() {
  const { t, i18n } = useTranslation();

  // --- State and setters are now sourced exclusively from the global store ---
  const {
    language,
    countryProfile,
    mainCurrency,
    setLanguage,
    setCountryProfile,
    setMainCurrency,
  } = useSettingsStore();

  // Local state for the currently displayed default values
  const [currentDefaults, setCurrentDefaults] = useState<DefaultsConfig>(
    allDefaults[countryProfile] || deDefaultValues,
  );
  // Local state for exchange rates, as it's not part of the global settings
  const [exchangeRates, setExchangeRates] = useState({ CZK: 24.75, CHF: 0.98 });

  const isCustomProfile = countryProfile === 'custom';

  // Effect to update the displayed defaults when the countryProfile changes
  useEffect(() => {
    if (countryProfile !== 'custom') {
      setCurrentDefaults(allDefaults[countryProfile]);
    } else {
      // For a custom profile, create a deep copy of the German defaults to allow modifications
      setCurrentDefaults(JSON.parse(JSON.stringify(deDefaultValues)));
    }
  }, [countryProfile]);

  // Memoized options for select dropdowns to prevent re-computation on every render
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

  const currencyOptions = useMemo(
    () => [
      { value: 'EUR', label: 'Euro (EUR)' },
      { value: 'CZK', label: 'Czech Koruna (CZK)' },
      { value: 'CHF', label: 'Swiss Franc (CHF)' },
    ],
    [],
  );

  // Function to handle language change in the store and i18next
  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  // Function to reset all settings to their initial state
  const handleReset = () => {
    setCountryProfile('de');
    setMainCurrency('EUR');
    // Also reset local state
    setExchangeRates({ CZK: 24.75, CHF: 0.98 });
  };

  // Get the display label for the currently selected country profile
  const selectedCountryLabel = useMemo(
    () => countryOptions.find((c) => c.value === countryProfile)?.label,
    [countryProfile, countryOptions],
  );

  // Safely destructure data from the current defaults
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
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                {t('optionsMenu.coreSettings')}
              </Typography>
              <FormControl fullWidth sx={{ mb: 2.5 }}>
                <InputLabel id="language-select-label">{t('optionsMenu.language')}</InputLabel>
                <Select
                  labelId="language-select-label"
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
                <InputLabel id="currency-select-label">{t('optionsMenu.mainCurrency')}</InputLabel>
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
                <InputLabel id="defaults-select-label">{t('optionsMenu.defaultValues')}</InputLabel>
                <Select
                  labelId="defaults-select-label"
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
        {meta && purchaseCosts && (
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
              data={{ ...purchaseCosts.basic, ...purchaseCosts.additional }}
              currency={meta.currency}
              isEditable={isCustomProfile}
            />
          </Box>
        )}

        {/* Reset Button */}
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
