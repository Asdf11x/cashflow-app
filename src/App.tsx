import { Routes, Route } from 'react-router-dom';
import Layout from './app/layout/Layout';
import InvestmentsList from './app/routes/InvestmentsList';
import CreditsList from './app/routes/CreditsList';
import OptionsMenu from './app/routes/OptionsMenu.tsx';
import CashflowList from './app/routes/CashflowList.tsx';
import CashflowVisualization from './app/routes/CashflowVisualization.tsx';

export default function App() {
  // useVisualViewport();

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<InvestmentsList />} />
        <Route path="credits" element={<CreditsList />} />
        <Route path="cashflow" element={<CashflowList />} />
        <Route path="options" element={<OptionsMenu />} />
        <Route path="visualization" element={<CashflowVisualization />} />
      </Route>
    </Routes>
  );
}
