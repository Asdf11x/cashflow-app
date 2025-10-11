import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  language: string;
  countryProfile: string;
  mainCurrency: string; // 'EUR', 'CZK', 'CHF', or 'NONE'
  exchangeRates: {
    [key: string]: number; // e.g., { CZK: 24.75, CHF: 0.98 } relative to EUR
  };
  setLanguage: (lang: string) => void;
  setCountryProfile: (profile: string) => void;
  setMainCurrency: (currency: string) => void;
  setExchangeRates: (rates: { [key: string]: number }) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Initial default values
      language: 'de',
      countryProfile: 'de',
      mainCurrency: 'EUR', // Default to EUR
      exchangeRates: {
        CZK: 24.35,
        CHF: 0.93,
      },

      // Setter functions to update the state
      setLanguage: (lang) => set({ language: lang }),
      setCountryProfile: (profile) => set({ countryProfile: profile }),
      setMainCurrency: (currency) => set({ mainCurrency: currency }),
      setExchangeRates: (rates) => set({ exchangeRates: rates }),
    }),
    {
      // The name for the item in localStorage
      name: 'app-settings-storage',
    },
  ),
);
