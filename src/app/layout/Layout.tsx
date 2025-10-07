import * as React from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Divider,
  useMediaQuery,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CreditScoreIcon from '@mui/icons-material/CreditScore';
import InsightsIcon from '@mui/icons-material/Insights';
import SettingsIcon from '@mui/icons-material/Settings';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';

import KofiButton from '../components/KofiButton';

const drawerWidth = 260;

const NAV = [
  { to: '/', text: 'Investments', icon: <AccountTreeIcon /> },
  { to: '/credits', text: 'Kredite', icon: <CreditScoreIcon /> },
  { to: '/cashflow', text: 'Abschätzung', icon: <InsightsIcon /> },
  { to: '/visualization', text: 'Visualisierung', icon: <ShowChartIcon /> }, // New Link
  { to: '/options', text: 'Optionen', icon: <SettingsIcon /> },
];
export default function Layout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const [open, setOpen] = React.useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const isVisualization = loc.pathname.startsWith('/visualization');

  const currentPage = NAV.find((item) =>
    item.to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(item.to),
  );
  const pageTitle = currentPage ? currentPage.text : 'Menu';

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box>
        <Toolbar>
          <Typography variant="h6" fontWeight={800}>
            Nearly. Estimation.
          </Typography>
        </Toolbar>
        <Divider />
        <List>
          {NAV.map((item) => {
            const active =
              item.to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(item.to);
            return (
              <ListItemButton
                key={item.to}
                selected={active}
                onClick={() => {
                  nav(item.to);
                  if (!isDesktop) setOpen(false);
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      <Box sx={{ p: 2, mt: 'auto' }}>
        <KofiButton id="cashy11" label="Support Me on Ko-fi" />
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        bgcolor: 'background.default',
      }}
    >
      <AppBar color="inherit" position="sticky" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {!isDesktop && (
            <IconButton edge="start" onClick={() => setOpen(true)} sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" fontWeight={700} sx={{ display: { lg: 'none' } }}>
            {pageTitle}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {isDesktop ? (
          <Drawer
            variant="permanent"
            PaperProps={{ sx: { width: drawerWidth, position: 'relative', borderWidth: 0 } }}
          >
            {drawer}
          </Drawer>
        ) : (
          <Drawer
            open={open}
            onClose={() => setOpen(false)}
            PaperProps={{ sx: { width: drawerWidth } }}
          >
            {drawer}
          </Drawer>
        )}

        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            overflowY: isVisualization ? 'hidden' : 'auto',
            p: isVisualization ? 0 : 2,
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
