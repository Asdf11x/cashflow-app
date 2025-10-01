import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#3b82f6' }, // CTA blue
    background: { default: '#ffffff', paper: '#ffffff' },
    divider: '#e5e7eb',
    text: { primary: '#0f172a' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: `ui-sans-serif, system-ui, Segoe UI, Roboto, Inter, Arial`,
    h4: { fontWeight: 700 },
  },
  components: {
    MuiAppBar: {
      styleOverrides: { root: { boxShadow: 'none', borderBottom: '1px solid #e5e7eb' } },
    },
    MuiPaper: { styleOverrides: { root: { boxShadow: '0 10px 30px rgba(0,0,0,.06)' } } },
    MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
  },
});

export default theme;
