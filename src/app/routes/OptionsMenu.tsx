import { useState, useEffect, useMemo } from 'react';
import deDefaultValues from '../../config/investments/deDefaultValues.json';
import czDefaultValues from '../../config/investments/czDefaultValues.json';
import chDefaultValues from '../../config/investments/chDefaultValues.json';

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

type DefaultsConfig = typeof deDefaultValues;

const allDefaults: Record<string, DefaultsConfig> = {
  de: deDefaultValues,
  cz: czDefaultValues,
  ch: chDefaultValues,
};

const countryOptions = [
  { value: 'de', label: 'Germany' },
  { value: 'cz', label: 'Czechia' },
  { value: 'ch', label: 'Switzerland' },
  { value: 'custom', label: 'Custom' },
];

const currencyOptions = [
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'CZK', label: 'Czech Koruna (CZK)' },
  { value: 'CHF', label: 'Swiss Franc (CHF)' },
];

const languageOptions = [
  { value: 'de', label: 'German' },
  { value: 'en', label: 'English' },
  { value: 'cz', label: 'Czech' },
];

// --- Helper Functions ---
const getDisplayValue = (item: any, currency: string): string => {
  const rate = item.rateOfPurchasePrice ?? item.rate ?? item.percentageOfAnnualColdRent;
  if (typeof rate === 'number') {
    return `${(rate * 100).toFixed(2)} %`;
  }
  if (typeof item.manualAnnualAmount === 'number' && item.manualAnnualAmount > 0) {
    return `${item.manualAnnualAmount.toLocaleString('de-DE')} ${currency}`;
  }
  return 'N/A';
};

// --- Reusable Data Section Component ---
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
              <TableCell>Description</TableCell>
              <TableCell align="right">Default Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(data).map(([key, item]) => (
              <TableRow key={key}>
                <TableCell component="th" scope="row">
                  {item.label_de || item.label}
                  {item.optional && (
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{ ml: 1, color: 'text.secondary' }}
                    >
                      (Optional)
                    </Typography>
                  )}
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
  const [language, setLanguage] = useState('de');
  const [mainCurrency, setMainCurrency] = useState('EUR');
  const [selectedCountry, setSelectedCountry] = useState('de');
  const [currentDefaults, setCurrentDefaults] = useState<DefaultsConfig>(deDefaultValues);
  const [exchangeRates, setExchangeRates] = useState({ CZK: 24.75, CHF: 0.98 });

  const isCustomProfile = selectedCountry === 'custom';

  useEffect(() => {
    if (selectedCountry !== 'custom') {
      setCurrentDefaults(allDefaults[selectedCountry]);
    } else {
      // Create a deep copy for editing when switching to custom
      setCurrentDefaults(JSON.parse(JSON.stringify(deDefaultValues)));
    }
  }, [selectedCountry]);

  const handleReset = () => {
    setLanguage('de');
    setMainCurrency('EUR');
    setSelectedCountry('de');
    setExchangeRates({ CZK: 24.75, CHF: 0.98 });
    // This will trigger the useEffect to reset the defaults
  };

  const selectedCountryLabel = useMemo(
    () => countryOptions.find((c) => c.value === selectedCountry)?.label,
    [selectedCountry],
  );

  const { meta, purchaseCosts, rent, runningCosts } = currentDefaults;

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Options
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Select your preferred settings and default calculation values.
        </Typography>

        {/* --- SETTINGS & CURRENCY --- */}
        <Grid container spacing={4}>
          {/* Column 1: Core Settings */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Core Settings
              </Typography>
              <Box component="form" noValidate autoComplete="off">
                <FormControl fullWidth sx={{ mb: 2.5 }}>
                  <InputLabel id="language-select-label">Language</InputLabel>
                  <Select
                    labelId="language-select-label"
                    value={language}
                    label="Language"
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    {languageOptions.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth sx={{ mb: 2.5 }}>
                  <InputLabel id="currency-select-label">Main Currency</InputLabel>
                  <Select
                    labelId="currency-select-label"
                    value={mainCurrency}
                    label="Main Currency"
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
                  <InputLabel id="defaults-select-label">Default Values</InputLabel>
                  <Select
                    labelId="defaults-select-label"
                    value={selectedCountry}
                    label="Default Values"
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
        <Box>
          <Typography variant="h5" component="h2" gutterBottom>
            Defaults for: <strong>{selectedCountryLabel}</strong>
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Paper variant="outlined" sx={{ px: 1.5, py: 0.5 }}>
              <Typography variant="body2">
                Country: <strong>{meta.country}</strong>
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ px: 1.5, py: 0.5 }}>
              <Typography variant="body2">
                Currency: <strong>{meta.currency}</strong>
              </Typography>
            </Paper>
          </Box>
          {isCustomProfile && (
            <Typography variant="body2" color="primary" sx={{ fontStyle: 'italic', mb: 2 }}>
              You are in the "Custom" profile. All values below are editable.
            </Typography>
          )}

          <DataSection
            title="Purchase Costs"
            data={{ ...purchaseCosts.basicCosts, ...purchaseCosts.additionalCosts }}
            currency={meta.currency}
            isEditable={isCustomProfile}
          />
          <DataSection
            title="Rent Taxes"
            data={rent.taxes}
            currency={meta.currency}
            isEditable={isCustomProfile}
          />
          <DataSection
            title="Annual Running Costs"
            data={runningCosts}
            currency={meta.currency}
            isEditable={isCustomProfile}
          />
        </Box>

        {/* --- ACTIONS --- */}
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<RestoreIcon />}
            onClick={handleReset}
          >
            Reset All to Defaults
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
