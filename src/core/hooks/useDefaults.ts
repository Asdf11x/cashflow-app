import * as React from 'react';
import { useSettingsStore } from '../state/useSettingsStore';

// Import all default value configurations
import deDefaults from '../../config/defaults/de/default-values.json';
import chDefaults from '../../config/defaults/ch/default-values.json';
import czDefaults from '../../config/defaults/cz/default-values.json';

// Define a type for the structure of the default values JSON files.
// This ensures type safety for all default configurations.
export type DefaultsConfig = typeof deDefaults;

// Create a record mapping country codes to their default configuration.
const allDefaults: Record<string, DefaultsConfig> = {
  de: deDefaults as DefaultsConfig, // Added type assertion for safety
  cz: czDefaults as DefaultsConfig, // Added type assertion for safety
  ch: chDefaults as DefaultsConfig, // Added type assertion for safety
};

/**
 * A custom hook that provides the correct default values configuration
 * based on the user's currently selected countryProfile.
 *
 * It encapsulates the logic of importing and selecting the country-specific
 * JSON files, keeping components clean.
 *
 * @returns {DefaultsConfig} The configuration object for the current country.
 */
export const useDefaults = (): DefaultsConfig => {
  // Destructure countryProfile AND customDefaults from the settings store
  const { countryProfile, customDefaults } = useSettingsStore(); // <--- ADDED customDefaults

  // useMemo ensures that we only re-calculate the defaults object when the
  // countryProfile or customDefaults changes.
  const defaults = React.useMemo(() => {
    if (countryProfile === 'custom') {
      return customDefaults;
    }

    return allDefaults[countryProfile] || deDefaults;
  }, [countryProfile, customDefaults]); // <--- ADDED customDefaults dependency

  return defaults;
};
