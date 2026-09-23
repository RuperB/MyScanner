export const Colors = {
  primary: '#2563EB', // Blue 600
  primaryDark: '#1D4ED8',
  primaryLight: '#60A5FA',
  primaryMuted: 'rgba(37, 99, 235, 0.12)',

  accent: '#10B981', // Emerald 500
  accentDark: '#059669',
  accentMuted: 'rgba(16, 185, 129, 0.12)',

  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.12)',

  danger: '#EF4444',
  dangerMuted: 'rgba(239, 68, 68, 0.12)',

  // Dark palette (Default modern luxury dark theme)
  bgDark: '#0B0F17',
  bgCardDark: '#131B2A',
  bgElevatedDark: '#1E293B',
  borderDark: '#334155',
  textPrimaryDark: '#F8FAFC',
  textSecondaryDark: '#94A3B8',
  textMutedDark: '#64748B',

  // Light palette
  bgLight: '#F8FAFC',
  bgCardLight: '#FFFFFF',
  bgElevatedLight: '#F1F5F9',
  borderLight: '#E2E8F0',
  textPrimaryLight: '#0F172A',
  textSecondaryLight: '#475569',
  textMutedLight: '#94A3B8',

  white: '#FFFFFF',
  black: '#000000',
  cameraOverlay: 'rgba(0, 0, 0, 0.65)',
  guideColor: '#38BDF8',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 6,
  md: 12,
  lg: 18,
  xl: 24,
  full: 9999,
};

export const Typography = {
  fontSize: {
    xs: 13,
    sm: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 30,
    hero: 36,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
};
