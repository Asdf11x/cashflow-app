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
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';

import KofiButton from '../components/KofiButton';
// import Logo from '../components/Logo'; // Your custom SVG logo

const drawerWidth = 260;

const NAV = [
  { to: '/', text: 'Investments', icon: <AccountTreeIcon /> },
  { to: '/credits', text: 'Credits', icon: <CreditScoreIcon /> },
  { to: '/cashflow', text: 'Cashflow', icon: <InsightsIcon /> },
  { to: '/options', text: 'Options', icon: <SettingsIcon /> },
];

export default function Layout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const [open, setOpen] = React.useState(false);
  const nav = useNavigate();
  const loc = useLocation();

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* This Box contains the main navigation and logo */}
      <Box>
        {/* --- 2. Use your Logo and a title inside the AppBar's Toolbar space --- */}
        <Toolbar>
          {/*<Logo sx={{ mr: 1, width: 32, height: 32, color: 'primary.main' }} />*/}
          <Typography variant="h6" fontWeight={800}>
            cashflow-app
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

      {/* This Box contains the Ko-fi button and is pushed to the bottom */}
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
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      {/* --- 3. The AppBar is now CLEANER and ONLY for mobile/top bar --- */}
      <AppBar color="inherit" position="sticky" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {!isDesktop && (
            <IconButton edge="start" onClick={() => setOpen(true)} sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
          )}
          {/* This title is now only visible on mobile, as the drawer has its own */}
          <Typography variant="h6" fontWeight={700} sx={{ display: { lg: 'none' } }}>
            cashflow-app
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flex: 1 }}>
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

        <Box component="main" sx={{ flex: 1, p: 2, minWidth: 0 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
