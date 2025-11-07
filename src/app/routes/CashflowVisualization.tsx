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
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  useMediaQuery,
} from '@mui/material';
import { ResponsiveLine } from '@nivo/line';
import type { LegendProps } from '@nivo/legends';
import SearchIcon from '@mui/icons-material/Search';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { fmtMoney } from '../../core/domain/calc';
import { useEnrichedCashflows } from '../../core/hooks/useEnrichedCashflows';

const DEFAULT_ASSUMPTIONS = {
  rentIncreasePct: 1.0,
  monthlyFlatDeduction: 0,
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const fmtIntegerCurrency = (value: number | string) => {
  return fmtMoney(String(Math.round(Number(value))));
};

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
  const formattedValue = fmtIntegerCurrency(pointData.y);
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

export default function CashflowVisualization() {
  const isSmallScreen = useMediaQuery('(max-width:900px)');
  const allEnrichedCashflows = useEnrichedCashflows();

  const [selectedIds, setSelectedIds] = React.useState<string[]>(() =>
    allEnrichedCashflows.length > 0 ? allEnrichedCashflows.map((cf) => cf.id) : [],
  );
  const [assumptions, setAssumptions] = React.useState(DEFAULT_ASSUMPTIONS);
  const [activeTab, setActiveTab] = React.useState(0);
  const [maxYears, setMaxYears] = React.useState(25);
  const [controlsCollapsed, setControlsCollapsed] = React.useState(isSmallScreen);
  const [searchTerm, setSearchTerm] = React.useState('');

  React.useEffect(() => {
    if (isSmallScreen) {
      setControlsCollapsed(true);
    }
  }, [isSmallScreen]);

  const handleSelectionChange = (id: string, isChecked: boolean) => {
    setSelectedIds((prev) =>
      isChecked ? [...prev, id] : prev.filter((selectedId) => selectedId !== id),
    );
  };

  const handleSliderChange = (name: keyof typeof DEFAULT_ASSUMPTIONS, value: number | number[]) => {
    setAssumptions((prev) => ({ ...prev, [name]: Array.isArray(value) ? value[0] : value }));
  };

  const filteredCashflows = React.useMemo(
    () =>
      allEnrichedCashflows.filter((cf) => cf.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [allEnrichedCashflows, searchTerm],
  );

  const cumulativeCashflowData = React.useMemo(() => {
    const selectedCashflows = allEnrichedCashflows.filter((cf) => selectedIds.includes(cf.id));
    const growthRate = assumptions.rentIncreasePct / 100;
    const flatDeduction = assumptions.monthlyFlatDeduction;

    return selectedCashflows.map((cf) => {
      const initialYearlyNetGain = cf.displayCashflowYearly;
      const dataPoints: { x: number; y: number }[] = [{ x: 0, y: 0 }];
      let cumulativeCashflow = 0;
      let currentYearlyNetGain = initialYearlyNetGain;

      for (let year = 1; year <= 25; year++) {
        if (year > 1) {
          currentYearlyNetGain *= 1 + growthRate;
        }
        const yearlyNetCashflow = currentYearlyNetGain - flatDeduction * 12;
        cumulativeCashflow += yearlyNetCashflow;
        dataPoints.push({ x: year, y: parseFloat(cumulativeCashflow.toFixed(2)) });
      }
      return { id: cf.name, data: dataPoints };
    });
  }, [allEnrichedCashflows, selectedIds, assumptions]);

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

  const axisTickValues = React.useMemo(() => {
    if (maxYears <= 12) {
      return Array.from({ length: maxYears }, (_, i) => i + 1);
    }
    return yearSliderMarks.map((m) => m.value).filter((v) => v <= maxYears);
  }, [maxYears]);

  const sidebarWidth = controlsCollapsed ? (isSmallScreen ? '100%' : 80) : 260;
  const chartFlexBasis = isSmallScreen ? '100%' : 1;

  const Controls = (
    <Paper
      sx={{
        p: 2,
        height: isSmallScreen && !controlsCollapsed ? 'auto' : '100%',
        display: 'flex',
        flexDirection: 'column',
        width: sidebarWidth,
        minWidth: sidebarWidth,
        flexShrink: controlsCollapsed ? 0 : 1,
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
                const annualNetGain =
                  cf.displayCashflowYearly - assumptions.monthlyFlatDeduction * 12;
                const initialCost = parseFloat((cf as any)?.totalCost || '0');
                const roi = initialCost > 0 ? (annualNetGain / initialCost) * 100 : 0;
                return (
                  <FormControlLabel
                    key={cf.id}
                    sx={{ alignItems: 'flex-start', margin: '4px 0' }}
                    control={
                      <Checkbox
                        checked={selectedIds.includes(cf.id)}
                        onChange={(e) => handleSelectionChange(cf.id, e.target.checked)}
                      />
                    }
                    label={
                      <Box sx={{ overflow: 'hidden', pt: 0.5 }}>
                        <Typography variant="body1" noWrap>
                          {cf.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          lineHeight={1.2}
                          sx={{
                            display: 'block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          Jährl. Ertrag:&nbsp;
                          {fmtIntegerCurrency(annualNetGain)} €
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

  const chartMargin = {
    top: 20,
    right: isSmallScreen ? 20 : 40,
    bottom: isSmallScreen ? 120 : 100,
    left: isSmallScreen ? 50 : 80,
  };

  const chartLegend: LegendProps = {
    anchor: 'bottom-left',
    direction: 'column',
    justify: false,
    translateX: 0,
    translateY: isSmallScreen ? 95 : 80,
    itemsSpacing: 2,
    itemWidth: 180,
    itemHeight: 20,
    itemDirection: 'left-to-right',
    itemOpacity: 0.85,
    symbolSize: 12,
    effects: [
      {
        on: 'hover',
        style: {
          itemOpacity: 1,
        },
      },
    ],
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isSmallScreen ? 'column' : 'row',
        height: isSmallScreen ? 'auto' : 'calc(100vh - 64px)',
        p: 2,
        gap: 2,
      }}
    >
      <Paper
        sx={{
          flexGrow: 1,
          p: isSmallScreen ? 1 : 2,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          flexBasis: chartFlexBasis,
          overflow: 'hidden',
          order: isSmallScreen ? 1 : 0,
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
              gap: 2,
              mb: 2,
              flexShrink: 0,
              flexDirection: isSmallScreen ? 'column' : 'row',
              alignItems: isSmallScreen ? 'flex-start' : 'center',
            }}
          >
            {/* MODIFICATION START */}
            {/* This Box now has a fixed min-width on larger screens. This prevents the slider */}
            {/* from shifting position when 'maxYears' changes from 1 to 2 digits. */}
            <Box sx={{ minWidth: isSmallScreen ? 'auto' : '115px' }}>
              <Typography variant="body2">Zeitraum: {maxYears} Jahre</Typography>
            </Box>
            {/* MODIFICATION END */}
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
          <Box sx={{ flex: 1, width: '100%', minHeight: isSmallScreen ? 300 : 400 }}>
            {visibleChartData.length > 0 ? (
              <ResponsiveLine
                data={visibleChartData}
                margin={chartMargin}
                xScale={{ type: 'linear', min: 0, max: maxYears }}
                yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                axisBottom={{
                  legend: 'Jahre',
                  legendOffset: isSmallScreen ? 35 : 40,
                  legendPosition: 'middle',
                  tickValues: axisTickValues,
                }}
                axisLeft={{
                  legend: 'Kumulativer Cashflow',
                  legendOffset: isSmallScreen ? -40 : -65,
                  legendPosition: 'middle',
                  format: (v) => `${fmtIntegerCurrency(v)} €`,
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
                legends={[chartLegend]}
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
      <Box
        sx={{
          flexShrink: 0,
          width: isSmallScreen ? '100%' : sidebarWidth,
          order: isSmallScreen ? 2 : 1,
          display: isSmallScreen && controlsCollapsed && !controlsCollapsed ? 'none' : 'block',
        }}
      >
        {Controls}
      </Box>
    </Box>
  );
}
