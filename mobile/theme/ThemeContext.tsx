import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import {
  darkColors,
  lightColors,
  radius,
  spacing,
  typography,
  type Scheme,
  type Theme,
  type ThemePreference,
} from './tokens';

const STORAGE_KEY = 'timesight.themePreference.v1';

function isPreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

type ThemeContextValue = {
  theme: Theme;
  scheme: Scheme;
  preference: ThemePreference;
  ready: boolean;
  setPreference: (preference: ThemePreference) => void;
  toggleScheme: () => void;
  followDevice: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const deviceScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (active && isPreference(stored)) {
          setPreferenceState(stored);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) {
          setReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const scheme: Scheme =
    preference === 'system' ? (deviceScheme === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo<ThemeContextValue>(() => {
    const setPreference = (next: ThemePreference) => {
      setPreferenceState(next);
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
    };

    return {
      theme: {
        scheme,
        colors: scheme === 'dark' ? darkColors : lightColors,
        spacing,
        radius,
        typography,
      },
      scheme,
      preference,
      ready,
      setPreference,
      toggleScheme: () => setPreference(scheme === 'dark' ? 'light' : 'dark'),
      followDevice: () => setPreference('system'),
    };
  }, [scheme, preference, ready]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be called inside a ThemeProvider');
  }
  return context;
}
