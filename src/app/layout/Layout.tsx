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
    <Box sx={{ width: drawerWidth }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" fontWeight={800}>
          cashflow-app
        </Typography>
      </Box>
      <Divider />
      <List>
        {NAV.map((item) => {
          const active = item.to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(item.to);
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
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar color="inherit" position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {!isDesktop && (
            <IconButton onClick={() => setOpen(true)} edge="start" sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Investments
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      {isDesktop ? (
        <Drawer
          variant="permanent"
          PaperProps={{ sx: { width: drawerWidth, borderRight: '1px solid #e5e7eb' } }}
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

      {/* Content */}
      <Box
        component="main"
        sx={{ flex: 1, p: 2, mt: 8, ...(isDesktop && { ml: `${drawerWidth}px` }) }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
