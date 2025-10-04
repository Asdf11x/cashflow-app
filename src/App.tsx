import { Routes, Route } from 'react-router-dom';
import Layout from './app/layout/Layout';
import InvestmentsList from './app/routes/InvestmentsList';
import CreditsList from './app/routes/CreditsList';
import Placeholder from './app/routes/Placeholder';
import CashflowList from './app/routes/CashflowList.tsx';
import React, { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    // This function sets a CSS custom property (--vh) to the inner height of the window.
    const setVhProperty = () => {
      // We calculate 1% of the window's inner height
      const vh = window.innerHeight * 0.01;
      // Then we set the value in the --vh custom property on the root element
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Set the value on initial load
    setVhProperty();

    // Add an event listener to update the value on window resize (e.g., orientation change)
    window.addEventListener('resize', setVhProperty);

    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener('resize', setVhProperty);
    };
  }, []); // The empty dependency array ensures this effect runs only once on mount.

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
