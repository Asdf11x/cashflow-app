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
    >
      {value === index && (
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
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

  // HACKY MODE: Get screen dimensions with responsive offset
  const [screenWidth, setScreenWidth] = React.useState(window.innerWidth);

  React.useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate responsive offset based on screen size
  const getResponsiveOffset = () => {
    if (screenWidth < 1200) return 80; // small screens
    if (screenWidth < 1600) return 300; // medium screens
    return 300; // large screens
  };

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

      // netGainMonthly is ALREADY calculated as: rent/income - credit - costs
      // So it's the FINAL monthly profit/loss
      const monthlyNetGain = parseFloat(investment?.netGainMonthly || '0');
      let yearlyNetGain = monthlyNetGain * 12;

      console.log('🔥 Cashflow Debug for:', cf.name, {
        monthlyNetGain,
        yearlyNetGain,
        'Should be positive?': monthlyNetGain > 0,
      });

      for (let year = 1; year <= 25; year++) {
        // Apply rent increase assumption to the net gain
        if (year > 1) {
          yearlyNetGain *= 1 + assumptions.rentIncreasePct / 100;
        }

        // The yearly net gain IS the cashflow for this year
        cumulativeCashflow += yearlyNetGain;
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
    { value: 1, label: '1' },
    { value: 5, label: '5' },
    { value: 10, label: '10' },
    { value: 15, label: '15' },
    { value: 20, label: '20' },
    { value: 25, label: '25' },
  ];

  // HACKY: Calculate sidebar width and chart width
  const sidebarWidth = controlsCollapsed ? 100 : 280;
  const responsiveOffset = getResponsiveOffset();
  const chartWidth = screenWidth - sidebarWidth - responsiveOffset;

  const Controls = (
    <Paper
      sx={{
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        width: controlsCollapsed ? 80 : 260,
      }}
    >
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
            placeholder="Suchen..."
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
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Globale Annahmen
            </Typography>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Mieterhöhung: {assumptions.rentIncreasePct.toFixed(1)}%
            </Typography>
            <Slider
              value={assumptions.rentIncreasePct}
              onChange={(_, val) => handleSliderChange('rentIncreasePct', val)}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v.toFixed(1)}%`}
              step={0.1}
              min={0}
              max={10}
              size="small"
              sx={{ mb: 2 }}
            />
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Kostensteigerung: {assumptions.costIncreasePct.toFixed(1)}%
            </Typography>
            <Slider
              value={assumptions.costIncreasePct}
              onChange={(_, val) => handleSliderChange('costIncreasePct', val)}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v.toFixed(1)}%`}
              step={0.1}
              min={0}
              max={10}
              size="small"
              sx={{ mb: 2 }}
            />
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Wertsteigerung: {assumptions.valueAppreciationPct.toFixed(1)}%
            </Typography>
            <Slider
              value={assumptions.valueAppreciationPct}
              onChange={(_, val) => handleSliderChange('valueAppreciationPct', val)}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v.toFixed(1)}%`}
              step={0.1}
              min={0}
              max={15}
              size="small"
              disabled
            />
          </Box>
        </>
      )}
    </Paper>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        height: 'calc(100vh - 64px)',
        p: 2,
        gap: 2,
      }}
    >
      {/* Sidebar */}
      <Box sx={{ flexShrink: 0 }}>{Controls}</Box>

      {/* Chart Area - HACKY MODE with explicit width */}
      <Paper
        sx={{
          flex: 1,
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          minWidth: chartWidth,
          maxWidth: chartWidth,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
            <Tab label="Kumulativer Cashflow" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              mb: 2,
              flexShrink: 0,
            }}
          >
            <Typography variant="body2" sx={{ minWidth: 100 }}>
              Zeitraum: {maxYears} Jahre
            </Typography>
            <Slider
              value={maxYears}
              onChange={(_, val) => setMaxYears(Array.isArray(val) ? val[0] : val)}
              marks={yearSliderMarks}
              min={1}
              max={25}
              valueLabelDisplay="auto"
              sx={{ flex: 1, maxWidth: 500 }}
            />
          </Box>

          <Box
            sx={{
              flex: 1,
              width: '100%',
              minHeight: 400,
            }}
          >
            {visibleChartData.length > 0 ? (
              <ResponsiveLine
                data={visibleChartData}
                margin={{ top: 20, right: 140, bottom: 60, left: 80 }}
                xScale={{ type: 'linear', min: 0, max: maxYears }}
                yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                axisBottom={{
                  legend: 'Jahre',
                  legendOffset: 40,
                  legendPosition: 'middle',
                }}
                axisLeft={{
                  legend: 'Kumulativer Cashflow',
                  legendOffset: -65,
                  legendPosition: 'middle',
                  format: (v) => `${fmtMoney(String(v))} €`,
                }}
                curve="monotoneX"
                useMesh
                enablePoints={true}
                pointSize={8}
                pointBorderWidth={2}
                pointBorderColor={{ from: 'serieColor' }}
                enableGridX={true}
                enableGridY={true}
                legends={[
                  {
                    anchor: 'bottom-right',
                    direction: 'column',
                    translateX: 120,
                    translateY: 0,
                    itemWidth: 100,
                    itemHeight: 20,
                    itemsSpacing: 2,
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
    </Box>
  );
}

// --- END OF FILE CashflowVisualization.tsx ---
