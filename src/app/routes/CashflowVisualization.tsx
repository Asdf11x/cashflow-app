import * as React from 'react';
import {
  Box,
  Typography,
  Paper,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Slider,
  Divider,
  // useTheme,
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
// Removed: import { useInvestStore } from '../../core/state/useInvestStore';
// Removed: import { useCreditStore } from '../../core/state/useCreditStore';
import { fmtMoney } from '../../core/domain/calc';

// --- UPDATED DEFAULT_ASSUMPTIONS (Simplified) ---
const DEFAULT_ASSUMPTIONS = {
  // rentIncreasePct will now be used as Cashflow-Wachstum
  rentIncreasePct: 1.0,
  // New: Flat monthly deduction (e.g., for maintenance reserve)
  monthlyFlatDeduction: 0,
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

const SimpleCustomTooltip = ({ point }: any) => {
  if (!point || typeof point.data.y === 'undefined') {
    return null;
  }

  const pointData = point.data;
  const integerValue = Math.round(pointData.y);
  const formattedValue = fmtMoney(String(integerValue));
  const finalValueString = `${formattedValue} €`;
  const yearString = `Jahr ${pointData.xFormatted}:`;

  return (
    <Paper sx={{ p: 1, opacity: 0.9, borderLeft: `5px solid ${point.color}`, minWidth: '70px' }}>
      <Typography variant="body2" sx={{ fontWeight: 'bold', lineHeight: 1.2, display: 'block' }}>
        {yearString}
      </Typography>

      <Typography
        variant="body2"
        sx={{
          fontWeight: 'bold',
          fontSize: '1rem',
          lineHeight: 1.2,
          display: 'block',
          whiteSpace: 'nowrap',
        }}
      >
        {finalValueString}
      </Typography>
    </Paper>
  );
};

// --- Main Visualization Component ---
export default function CashflowVisualization() {
  // const theme = useTheme();

  // --- Data Fetching from Stores ---
  const cashflows = useCashflowStore((s) => s.cashflows);

  // --- Component State ---
  const [selectedIds, setSelectedIds] = React.useState<string[]>(() =>
    cashflows.length > 0 ? cashflows.map((cf) => cf.id) : [],
  );
  // Use the simplified default assumptions
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

  // Update handleSliderChange to handle the new assumption key
  const handleSliderChange = (name: keyof typeof DEFAULT_ASSUMPTIONS, value: number | number[]) => {
    setAssumptions((prev) => ({ ...prev, [name]: Array.isArray(value) ? value[0] : value }));
  };

  const filteredCashflows = React.useMemo(
    () => cashflows.filter((cf) => cf.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [cashflows, searchTerm],
  );

  const cumulativeCashflowData = React.useMemo(() => {
    const selectedCashflows = cashflows.filter((cf) => selectedIds.includes(cf.id));

    // Use the Cashflow-Wachstum rate
    const growthRate = assumptions.rentIncreasePct / 100;
    // Use the flat monthly deduction
    const flatDeduction = assumptions.monthlyFlatDeduction;

    return selectedCashflows.map((cf) => {
      // Assuming 'cf' now contains the initial net gain data directly.
      const initialMonthlyNetGain = parseFloat(
        (cf as any)?.initialMonthlyNetGain || cf.cashflowMonthly || '0',
      );

      const dataPoints: { x: number; y: number }[] = [{ x: 0, y: 0 }];
      let cumulativeCashflow = 0;

      // Start the simulation with the initial monthly cashflow
      let currentMonthlyNetGain = initialMonthlyNetGain; // Net gain BEFORE flat deduction

      console.log('🔥 Cashflow Debug for:', cf.name, {
        initialMonthlyNetGain,
        flatDeduction,
      });

      for (let year = 1; year <= 25; year++) {
        if (year > 1) {
          // Apply the Cashflow-Wachstum rate to the Monthly Net Gain
          currentMonthlyNetGain *= 1 + growthRate;
        }

        // Calculate the Annual Cashflow for this year:
        // Annual Cashflow = (Monthly Net Gain * 12) - (Flat Deduction * 12)
        const yearlyNetCashflow = currentMonthlyNetGain * 12 - flatDeduction * 12;

        cumulativeCashflow += yearlyNetCashflow;
        dataPoints.push({ x: year, y: parseFloat(cumulativeCashflow.toFixed(2)) });
      }

      return { id: cf.name, data: dataPoints };
    });
  }, [cashflows, selectedIds, assumptions]);

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
              {filteredCashflows.map((cf) => {
                // Calculation of initial annual net gain (for label only)
                const initialMonthlyNetGain = parseFloat(
                  (cf as any)?.initialMonthlyNetGain || cf.cashflowMonthly || '0',
                );
                // Calculate the true starting annual net gain after the flat deduction
                const annualNetGain =
                  (initialMonthlyNetGain - assumptions.monthlyFlatDeduction) * 12;

                // ASSUMPTION: 'totalCost' is now available on the cashflow object.
                const initialCost = parseFloat((cf as any)?.totalCost || '0');
                const roi = initialCost > 0 ? (annualNetGain / initialCost) * 100 : 0;

                return (
                  <FormControlLabel
                    key={cf.id}
                    // The main styling for the label box needs to ensure content fits the width
                    sx={{ alignItems: 'flex-start', margin: '4px 0' }} // Adjust alignment and margin
                    control={
                      <Checkbox
                        checked={selectedIds.includes(cf.id)}
                        onChange={(e) => handleSelectionChange(cf.id, e.target.checked)}
                      />
                    }
                    label={
                      // Removed my:-0.5, increased vertical space
                      <Box sx={{ overflow: 'hidden', pt: 0.5 }}>
                        {/* Line 1: Cashflow Name (noWrap is fine here) */}
                        <Typography variant="body1" noWrap>
                          {cf.name}
                        </Typography>

                        {/* Line 2: Annual Net Gain | ROI */}
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          lineHeight={1.2}
                          // Key change: nowrap for the entire line to force it onto one line
                          sx={{
                            display: 'block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {/* Shortened "Jährlicher Nettoertrag" to "Jährl. Ertrag" to save space */}
                          Jährl. Ertrag:&nbsp;
                          {/* Use String concatenation with a non-breaking space for value € */}
                          {/* Use the calculated annualNetGain, which includes the flat deduction */}
                          {fmtMoney(String(annualNetGain))} €
                          {/* Only show ROI if meaningful (> 0.001%) */}
                          {roi > 0.001 && ` | Rendite: ${roi.toFixed(1)}%`}
                        </Typography>
                      </Box>
                    }
                  />
                );
              })}
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

            {/* Cashflow-Wachstum (using rentIncreasePct key) */}
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Cashflow-Wachstum: {assumptions.rentIncreasePct.toFixed(1)}%
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

            {/* Monatliche Pauschalabzüge (€/Monat) - NEW SLIDER */}
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Monatliche Pauschalabzüge: {assumptions.monthlyFlatDeduction.toFixed(0)} €
            </Typography>
            <Slider
              value={assumptions.monthlyFlatDeduction}
              onChange={(_, val) => handleSliderChange('monthlyFlatDeduction', val)}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v.toFixed(0)}€`}
              step={10}
              min={0}
              max={500}
              size="small"
              sx={{ mb: 2 }}
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
                // Custom tooltip now safely defined
                tooltip={SimpleCustomTooltip}
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
