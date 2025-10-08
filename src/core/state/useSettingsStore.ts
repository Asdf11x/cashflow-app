import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Define the structure of your settings
interface SettingsState {
  language: string;
  countryProfile: string;
  mainCurrency: string;
  setLanguage: (lang: string) => void;
  setCountryProfile: (profile: string) => void;
  setMainCurrency: (currency: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Initial default values
      language: 'de',
      countryProfile: 'de',
      mainCurrency: 'EUR',

      // Setter functions to update the state
      setLanguage: (lang) => set({ language: lang }),
      setCountryProfile: (profile) => set({ countryProfile: profile }),
      setMainCurrency: (currency) => set({ mainCurrency: currency }),
    }),
    {
      // The name for the item in localStorage
      name: 'app-settings-storage',
    },
  ),
);
