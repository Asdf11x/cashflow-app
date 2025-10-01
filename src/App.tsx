import { Routes, Route } from 'react-router-dom';
import Layout from './app/layout/Layout';
import InvestmentsList from './app/routes/InvestmentsList';
import Placeholder from './app/routes/Placeholder';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<InvestmentsList />} />
        <Route path="credits" element={<Placeholder title="Credits" />} />
        <Route path="cashflow" element={<Placeholder title="Cashflow" />} />
        <Route path="options" element={<Placeholder title="Options" />} />
      </Route>
    </Routes>
  );
}
