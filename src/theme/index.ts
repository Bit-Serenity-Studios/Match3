export const palette = {
  bgDeep: '#100820',
  bgSurface: '#1a0f24',
  bgSurface2: '#251a34',
  parchment: '#efe4c9',
  parchmentDim: '#c9bd9a',
  candlelight: '#e6b25a',
  candlelightSoft: '#c98a37',
  emerald: '#4fae7c',
  emeraldDeep: '#2b6a49',
  purple: '#7f5bd0',
  purpleDeep: '#4b2f8a',
  border: '#3a2a4a',
  danger: '#c76a5a',
  overlay: 'rgba(16, 8, 32, 0.72)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, color: palette.parchment },
  h2: { fontSize: 20, fontWeight: '600' as const, color: palette.parchment },
  body: { fontSize: 14, color: palette.parchmentDim },
  small: { fontSize: 12, color: palette.parchmentDim },
  score: { fontSize: 22, fontWeight: '700' as const, color: palette.candlelight },
} as const;
