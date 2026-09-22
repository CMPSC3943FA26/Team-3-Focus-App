import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import {
  darkColors,
  lightColors,
  radius,
  spacing,
  typography,
  type Scheme,
  type Theme,
} from './tokens';

type ThemeContextValue = {
  theme: Theme;
  scheme: Scheme;
  isOverridden: boolean;
  setScheme: (scheme: Scheme) => void;
  toggleScheme: () => void;
  followDevice: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const deviceScheme = useColorScheme();
  const [override, setOverride] = useState<Scheme | null>(null);

  const scheme: Scheme = override ?? (deviceScheme === 'dark' ? 'dark' : 'light');

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: {
        scheme,
        colors: scheme === 'dark' ? darkColors : lightColors,
        spacing,
        radius,
        typography,
      },
      scheme,
      isOverridden: override !== null,
      setScheme: setOverride,
      toggleScheme: () => setOverride(scheme === 'dark' ? 'light' : 'dark'),
      followDevice: () => setOverride(null),
    }),
    [scheme, override]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be called inside a ThemeProvider');
  }
  return context;
}
