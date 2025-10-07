// --- START OF FILE CashflowVisualization.tsx ---

import * as React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Slider,
  Divider,
  useTheme,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
} from '@mui/material';
import { ResponsiveLine } from '@nivo/line';
import SearchIcon from '@mui/icons-material/Search';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { useCashflowStore } from '../../core/state/useCashflowStore';
import { useInvestStore } from '../../core/state/useInvestStore';
import { useCreditStore } from '../../core/state/useCreditStore';
import { type RealEstateInvestment } from '../../core/domain/types';
import { fmtMoney } from '../../core/domain/calc';

const DEFAULT_ASSUMPTIONS = {
  rentIncreasePct: 2.0,
  costIncreasePct: 1.5,
  valueAppreciationPct: 3.0,
};

// --- Tab Panel Helper Component ---
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`visualization-tabpanel-${index}`}
      aria-labelledby={`visualization-tab-${index}`}
      {...other}
      style={{ display: 'flex', flexGrow: 1, width: '100%' }}
    >
      {value === index && (
        <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, width: '100%', pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// --- Main Visualization Component ---
export default function CashflowVisualization() {
  const theme = useTheme();

  // --- Data Fetching from Stores ---
  const cashflows = useCashflowStore((s) => s.cashflows);
  const objects = useInvestStore((s) => s.objects);
  const realEstates = useInvestStore((s) => s.realEstates);
  const credits = useCreditStore((s) => s.credits);
  const allInvestments = React.useMemo(() => [...objects, ...realEstates], [objects, realEstates]);

  // --- Component State ---
  const [selectedIds, setSelectedIds] = React.useState<string[]>(() =>
    cashflows.length > 0 ? cashflows.map((cf) => cf.id) : [],
  );
  const [assumptions, setAssumptions] = React.useState(DEFAULT_ASSUMPTIONS);
  const [activeTab, setActiveTab] = React.useState(0);
  const [maxYears, setMaxYears] = React.useState(25);
  const [controlsCollapsed, setControlsCollapsed] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

  const handleSelectionChange = (id: string, isChecked: boolean) => {
    setSelectedIds((prev) =>
      isChecked ? [...prev, id] : prev.filter((selectedId) => selectedId !== id),
    );
  };

  const handleSliderChange = (name: keyof typeof assumptions, value: number | number[]) => {
    setAssumptions((prev) => ({ ...prev, [name]: Array.isArray(value) ? value[0] : value }));
  };

  const filteredCashflows = React.useMemo(
    () => cashflows.filter((cf) => cf.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [cashflows, searchTerm],
  );

  const cumulativeCashflowData = React.useMemo(() => {
    const selectedCashflows = cashflows.filter((cf) => selectedIds.includes(cf.id));
    return selectedCashflows.map((cf) => {
      const investment = allInvestments.find((i) => i.id === cf.investmentId);
      const credit = credits.find((c) => c.id === cf.creditId);

      const dataPoints: { x: number; y: number }[] = [{ x: 0, y: 0 }];
      let cumulativeCashflow = 0;
      let yearlyIncome = parseFloat(investment?.netGainMonthly || '0') * 12;
      const yearlyCreditCost = parseFloat(credit?.totalMonthly || '0') * 12;
      let yearlyRunningCosts = 0;

      if (investment?.kind === 'REAL_ESTATE') {
        const re = investment as RealEstateInvestment;
        yearlyRunningCosts = parseFloat(re.totalRunningCostsAnnually || '0');
      }

      for (let year = 1; year <= 25; year++) {
        if (year > 1) {
          yearlyIncome *= 1 + assumptions.rentIncreasePct / 100;
          yearlyRunningCosts *= 1 + assumptions.costIncreasePct / 100;
        }
        const netCashflowThisYear = yearlyIncome - yearlyCreditCost - yearlyRunningCosts;
        cumulativeCashflow += netCashflowThisYear;
        dataPoints.push({ x: year, y: parseFloat(cumulativeCashflow.toFixed(2)) });
      }
      return { id: cf.name, data: dataPoints };
    });
  }, [cashflows, allInvestments, credits, selectedIds, assumptions]);

  const visibleChartData = React.useMemo(() => {
    return cumulativeCashflowData.map((series) => ({
      ...series,
      data: series.data.filter((point) => point.x <= maxYears),
    }));
  }, [cumulativeCashflowData, maxYears]);

  const yearSliderMarks = [
    ...Array.from({ length: 10 }, (_, i) => ({ value: i + 1, label: `${i + 1}` })),
    { value: 15, label: '15' },
    { value: 20, label: '20' },
    { value: 25, label: '25' },
  ];

  const Controls = (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {!controlsCollapsed && <Typography variant="h6">Einstellungen</Typography>}
        <Tooltip title={controlsCollapsed ? 'Einblenden' : 'Ausblenden'}>
          <IconButton onClick={() => setControlsCollapsed(!controlsCollapsed)} sx={{ ml: 'auto' }}>
            <ChevronLeftIcon
              sx={{
                transform: controlsCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            />
          </IconButton>
        </Tooltip>
      </Box>
      <Divider sx={{ my: 1 }} />
      {!controlsCollapsed && (
        <>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder="Abschätzung suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 1 }}
          />
          <Box sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
            <FormGroup>
              {filteredCashflows.map((cf) => (
                <FormControlLabel
                  key={cf.id}
                  control={
                    <Checkbox
                      checked={selectedIds.includes(cf.id)}
                      onChange={(e) => handleSelectionChange(cf.id, e.target.checked)}
                    />
                  }
                  label={cf.name}
                />
              ))}
              {filteredCashflows.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Keine Treffer.
                </Typography>
              )}
            </FormGroup>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ px: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
              Globale Annahmen
            </Typography>
            <Typography gutterBottom>Mietsteigerung p.a.</Typography>
            <Slider
              value={assumptions.rentIncreasePct}
              onChange={(_, val) => handleSliderChange('rentIncreasePct', val)}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v.toFixed(1)}%`}
              step={0.1}
              min={0}
              max={10}
            />
            <Typography gutterBottom>Kostensteigerung p.a.</Typography>
            <Slider
              value={assumptions.costIncreasePct}
              onChange={(_, val) => handleSliderChange('costIncreasePct', val)}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v.toFixed(1)}%`}
              step={0.1}
              min={0}
              max={10}
            />
            <Typography gutterBottom>Wertsteigerung p.a.</Typography>
            <Slider
              value={assumptions.valueAppreciationPct}
              onChange={(_, val) => handleSliderChange('valueAppreciationPct', val)}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v.toFixed(1)}%`}
              step={0.1}
              min={0}
              max={15}
              disabled
            />
          </Box>
        </>
      )}
    </Paper>
  );

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        <Grid
          item
          xs={12}
          md={controlsCollapsed ? 1.5 : 4}
          lg={controlsCollapsed ? 1 : 3}
          sx={{ height: '100%' }}
        >
          {Controls}
        </Grid>

        <Grid
          item
          xs={12}
          md={controlsCollapsed ? 10.5 : 8}
          lg={controlsCollapsed ? 11 : 9}
          sx={{ height: '100%', minWidth: 1000 }}
        >
          <Paper
            sx={{
              height: '100%',
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              minWidth: 0,
            }}
          >
            <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
              {/* Tabs ... */}
            </Box>

            {/* TabPanel already flex; ensure the chart area can take remaining height */}
            <TabPanel value={activeTab} index={0}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, px: 2, flexShrink: 0 }}>
                {/* Slider ... */}
              </Box>

              {/* This wrapper gives the Nivo chart an explicit flex height */}
              <Box sx={{ flex: 1, minHeight: 0 }}>
                {visibleChartData.length > 0 ? (
                  <ResponsiveLine
                    data={visibleChartData}
                    margin={{ top: 20, right: 30, bottom: 40, left: 70 }}
                    xScale={{ type: 'linear', min: 0, max: maxYears }}
                    yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                    axisBottom={{ legend: 'Jahre', legendOffset: 30, legendPosition: 'middle' }}
                    axisLeft={{
                      legend: 'Kumulativer Cashflow',
                      legendOffset: -60,
                      legendPosition: 'middle',
                      format: (v) => `${fmtMoney(String(v))} €`,
                    }}
                    useMesh
                    legends={[
                      {
                        anchor: 'bottom',
                        direction: 'row',
                        translateY: 40,
                        itemWidth: 120,
                        itemHeight: 20,
                      },
                    ]}
                  />
                ) : (
                  <Box
                    sx={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography color="text.secondary">
                      Wählen Sie links eine Abschätzung aus.
                    </Typography>
                  </Box>
                )}
              </Box>
            </TabPanel>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
