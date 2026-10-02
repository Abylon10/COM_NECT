/**
 * App colors for light and dark mode. Teal brand color comes from the
 * Community Connect logo.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#FFFFFF',
    backgroundElement: '#F2F5F5',
    backgroundSelected: '#E2E8E8',
    textSecondary: '#60686C',
    border: '#E3E8E8',
    card: '#FFFFFF',
    primary: '#1F9E96',
    primarySoft: '#E3F4F3',
    onPrimary: '#FFFFFF',
    danger: '#E5484D',
    dangerSoft: '#FDECEC',
    warning: '#F5A524',
    warningSoft: '#FEF4E1',
    success: '#2E9F5B',
  },
  dark: {
    text: '#ECEDEE',
    background: '#0E1415',
    backgroundElement: '#1A2223',
    backgroundSelected: '#253031',
    textSecondary: '#A3ADB0',
    border: '#253031',
    card: '#151C1D',
    primary: '#38BDB4',
    primarySoft: '#173634',
    onPrimary: '#06201E',
    danger: '#FF6369',
    dangerSoft: '#3B1C1E',
    warning: '#FFB547',
    warningSoft: '#3A2D14',
    success: '#4CC38A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80, web: 88 }) ?? 0;
export const MaxContentWidth = 800;
