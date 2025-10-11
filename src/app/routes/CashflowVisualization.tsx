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
  useMediaQuery,
} from '@mui/material';
import { ResponsiveLine } from '@nivo/line';
import SearchIcon from '@mui/icons-material/Search';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { useCashflowStore } from '../../core/state/useCashflowStore';
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

// --- Custom Nivo Tooltip Component (Fixing Decimals and Wrapping) ---
const SimpleCustomTooltip = ({ point }: any) => {
  // Safe check
  if (!point || typeof point.data.y === 'undefined') {
    return null;
  }

  const pointData = point.data;

  // 1. Get the value as an integer (no decimals)
  const integerValue = Math.round(pointData.y);

  // 2. Format the integer value (assuming fmtMoney handles thousands separators, etc.)
  const formattedValue = fmtMoney(String(integerValue));

  // 3. Combine value and currency into a single string
  const finalValueString = `${formattedValue} €`;

  // Year string stays separate
  const yearString = `Jahr ${pointData.xFormatted}:`;

  return (
    // minWidth is still helpful to prevent wrapping
    <Paper sx={{ p: 1, opacity: 0.9, borderLeft: `5px solid ${point.color}`, minWidth: '70px' }}>
      {/* First line: Jahr X: (using body2 and bold for better visibility) */}
      <Typography variant="body2" sx={{ fontWeight: 'bold', lineHeight: 1.2, display: 'block' }}>
        {yearString}
      </Typography>

      {/* Second line: y € (NOW in a single string, with no decimals, and GUARANTEED no wrap) */}
      <Typography
        variant="body2"
        sx={{
          fontWeight: 'bold',
          fontSize: '1rem',
          lineHeight: 1.2,
          display: 'block',
          whiteSpace: 'nowrap', // Prevents line breaks within the value string
        }}
      >
        {finalValueString}
      </Typography>
    </Paper>
  );
};

// --- Main Visualization Component ---
export default function CashflowVisualization() {
  // --- Responsive Hooks (New SOTA approach) ---
  // Determine if we are on a small screen (e.g., less than 900px)
  const isSmallScreen = useMediaQuery('(max-width:900px)');

  // --- Data Fetching from Stores ---
  const cashflows = useCashflowStore((s) => s.cashflows);

  // --- Component State ---
  const [selectedIds, setSelectedIds] = React.useState<string[]>(() =>
    cashflows.length > 0 ? cashflows.map((cf) => cf.id) : [],
  );
  const [assumptions, setAssumptions] = React.useState(DEFAULT_ASSUMPTIONS);
  const [activeTab, setActiveTab] = React.useState(0);
  const [maxYears, setMaxYears] = React.useState(25);
  // Default to collapsed on small screens
  const [controlsCollapsed, setControlsCollapsed] = React.useState(isSmallScreen);
  const [searchTerm, setSearchTerm] = React.useState('');

  // --- Removed HACKY screen width logic and dependencies ---
  // const [screenWidth, setScreenWidth] = React.useState(window.innerWidth);
  // React.useEffect(() => { ... }, []);
  // const getResponsiveOffset = () => { ... };

  // useEffect to sync collapsed state on screen size change
  React.useEffect(() => {
    // If the screen size is small, force controls to be collapsed
    if (isSmallScreen) {
      setControlsCollapsed(true);
    }
  }, [isSmallScreen]);
  // --- End Removed HACKY logic ---

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

    const growthRate = assumptions.rentIncreasePct / 100;
    const flatDeduction = assumptions.monthlyFlatDeduction;

    return selectedCashflows.map((cf) => {
      const initialMonthlyNetGain = parseFloat(
        (cf as any)?.initialMonthlyNetGain || cf.cashflowMonthly || '0',
      );

      const dataPoints: { x: number; y: number }[] = [{ x: 0, y: 0 }];
      let cumulativeCashflow = 0;

      let currentMonthlyNetGain = initialMonthlyNetGain;

      for (let year = 1; year <= 25; year++) {
        if (year > 1) {
          currentMonthlyNetGain *= 1 + growthRate;
        }

        // Calculation: Yearly CF = (Monthly Growing CF * 12) - (Fixed Deduction * 12)
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

  // --- Responsive Control Widths ---
  const sidebarWidth = controlsCollapsed ? (isSmallScreen ? '100%' : 80) : 260;
  // On small screens, chartWidth is 100% of available space minus the padding
  const chartFlexBasis = isSmallScreen ? '100%' : 1;

  const Controls = (
    <Paper
      sx={{
        p: 2,
        height: isSmallScreen && !controlsCollapsed ? 'auto' : '100%', // Auto height on mobile when open
        display: 'flex',
        flexDirection: 'column',
        // Use fixed width for desktop sidebar, full width for mobile collapsed view (simulating a drawer)
        width: sidebarWidth,
        minWidth: sidebarWidth,
        flexShrink: controlsCollapsed ? 0 : 1,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {!controlsCollapsed && <Typography variant="h6">Einstellungen</Typography>}
        <Tooltip title={controlsCollapsed ? 'Einblenden' : 'Ausblenden'}>
          <IconButton
            // On small screens, hide the icon when collapsed if controls go to a drawer/overlay later
            onClick={() => setControlsCollapsed(!controlsCollapsed)}
            sx={{ ml: 'auto' }}
          >
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

  // --- Nivo Chart Adjustments ---
  // Move legends to bottom-left on all screen sizes to save horizontal space
  const chartMargin = {
    top: 20,
    right: isSmallScreen ? 20 : 40,
    bottom: isSmallScreen ? 100 : 60,
    left: isSmallScreen ? 50 : 80,
  };
  const chartLegend = {
    anchor: 'bottom-left' as const, // Change from bottom-right to bottom-left
    direction: 'row' as const, // Change from column to row for better mobile fit
    translateX: 0,
    translateY: isSmallScreen ? 50 : 50, // Move down further on small screen
    itemWidth: isSmallScreen ? 60 : 100, // Reduced item width on small screen
    itemHeight: 20,
    itemsSpacing: isSmallScreen ? 5 : 2,
    symbolSize: 10,
  };

  return (
    <Box
      sx={{
        display: 'flex',
        // Stacks columns on small screens, rows on large screens
        flexDirection: isSmallScreen ? 'column' : 'row',
        height: isSmallScreen ? 'auto' : 'calc(100vh - 64px)', // Auto height on mobile
        p: 2,
        gap: 2,
      }}
    >
      {/* Chart Area */}
      <Paper
        sx={{
          flexGrow: 1,
          p: isSmallScreen ? 1 : 2, // Less padding on mobile
          display: 'flex',
          flexDirection: 'column',
          // Remove HACKY fixed width constraints, use flex
          minWidth: 0,
          flexBasis: chartFlexBasis,
          overflow: 'hidden',
          order: isSmallScreen ? 1 : 0, // Chart is the main content, appears first/on top
        }}
      >
        {/* Header/Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
            <Tab label="Kumulativer Cashflow" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          {/* Timeframe Slider */}
          <Box
            sx={{
              display: 'flex',
              // alignItems: 'center',
              gap: 2,
              mb: 2,
              flexShrink: 0,
              flexDirection: isSmallScreen ? 'column' : 'row', // Stack slider label and slider
              alignItems: isSmallScreen ? 'flex-start' : 'center',
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
              sx={{ flex: 1, maxWidth: isSmallScreen ? '100%' : 500 }}
            />
          </Box>

          {/* Nivo Chart Container */}
          <Box
            sx={{
              flex: 1,
              width: '100%',
              minHeight: isSmallScreen ? 300 : 400, // Reduced height for mobile
            }}
          >
            {visibleChartData.length > 0 ? (
              <ResponsiveLine
                data={visibleChartData}
                margin={chartMargin} // Use responsive margin
                xScale={{ type: 'linear', min: 0, max: maxYears }}
                yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                axisBottom={{
                  legend: 'Jahre',
                  legendOffset: isSmallScreen ? 35 : 40,
                  legendPosition: 'middle',
                }}
                axisLeft={{
                  legend: 'Kumulativer Cashflow',
                  legendOffset: isSmallScreen ? -40 : -65, // Less offset on mobile
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
                tooltip={SimpleCustomTooltip}
                legends={[chartLegend]} // Use responsive legend
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

      {/* Sidebar / Controls */}
      <Box
        sx={{
          flexShrink: 0,
          width: isSmallScreen ? '100%' : sidebarWidth,
          order: isSmallScreen ? 2 : 1, // Controls appear below chart on mobile
          // Only show the controls section when not collapsed on small screens
          display: isSmallScreen && controlsCollapsed && !controlsCollapsed ? 'none' : 'block',
        }}
      >
        {Controls}
      </Box>
    </Box>
  );
}
