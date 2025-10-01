import { Routes, Route } from 'react-router-dom';
import Layout from './app/layout/Layout';
import InvestmentsList from './app/routes/InvestmentsList';
import CreditsList from './app/routes/CreditsList';
import Placeholder from './app/routes/Placeholder';
import CashflowList from './app/routes/CashflowList.tsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<InvestmentsList />} />
        <Route path="credits" element={<CreditsList />} />
        <Route path="cashflow" element={<CashflowList />} />
        <Route path="options" element={<Placeholder title="Options" />} />
      </Route>
    </Routes>
  );
}
