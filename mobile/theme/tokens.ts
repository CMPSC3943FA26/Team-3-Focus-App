export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const typography = {
  family: 'Inter Tight',
  size: {
    display: 64,
    title: 24,
    body: 16,
    caption: 13,
  },
  weight: {
    regular: '400',
    medium: '500',
    bold: '700',
  },
} as const;

export type ColorTokens = {
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  accent: string;
  calm: string;
  warning: string;
  urgent: string;
};

export const lightColors: ColorTokens = {
  background: '#F6F5F2',
  surface: '#FFFFFF',
  textPrimary: '#1C1B19',
  textSecondary: '#6B6862',
  border: '#E2DFD8',
  accent: '#4A6D62',
  calm: '#5B8C7B',
  warning: '#C08A3E',
  urgent: '#B4543A',
};

export const darkColors: ColorTokens = {
  background: '#15181A',
  surface: '#1E2225',
  textPrimary: '#F1EFEA',
  textSecondary: '#9AA0A2',
  border: '#2C3134',
  accent: '#7FB0A0',
  calm: '#7FB0A0',
  warning: '#D9A75C',
  urgent: '#D97757',
};

export type Scheme = 'light' | 'dark';

export type Theme = {
  scheme: Scheme;
  colors: ColorTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
};
