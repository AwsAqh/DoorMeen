/**
 * DoorMeen Design Tokens — Mobile
 * Mirrors apps/web/src/index.css CSS variables exactly.
 * All colours, spacing and radius come from here — never hardcode values elsewhere.
 */

export const Colors = {
  // ── Backgrounds ─────────────────────────────────────────────────────────
  bgPrimary:   '#F5F0E6',
  bgSecondary: '#EEE5D7',
  bgTertiary:  '#E3D8C8',
  bgElevated:  '#111A2C',

  // ── Accent (Teal / Cyan) ─────────────────────────────────────────────────
  accent:      '#F59A17',
  accentLight: '#FFB13D',
  accentDark:  '#B96308',
  accentGlow:  'rgba(245, 154, 23, 0.22)',
  accentContrast: '#111A2C',
  highlight:   '#FFA51F',
  highlightBg: 'rgba(255, 165, 31, 0.15)',

  // ── Text ─────────────────────────────────────────────────────────────────
  textPrimary:   '#172033',
  textSecondary: '#515B6B',
  textMuted:     '#737B86',

  // ── Surfaces ─────────────────────────────────────────────────────────────
  surface:       '#FFFCF6',
  surfaceHover:  '#F7E8CF',
  surfaceBorder: 'rgba(23, 32, 51, 0.13)',
  surfaceStrong: '#111A2C',

  // ── Status ───────────────────────────────────────────────────────────────
  statusProgress:   '#E98A12',
  statusProgressBg: 'rgba(233, 138, 18, 0.14)',
  statusWaiting:    '#737B86',
  statusWaitingBg:  'rgba(115, 123, 134, 0.12)',

  // ── Utility ──────────────────────────────────────────────────────────────
  white:       '#ffffff',
  danger:      '#B84D42',
  dangerBg:    'rgba(184, 77, 66, 0.12)',
  success:     '#3F8058',
  successBg:   'rgba(63, 128, 88, 0.13)',
  warning:     '#B96308',
  warningBg:  'rgba(185, 99, 8, 0.12)',
} as const;

export const Spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  xxl:  32,
  xxxl: 48,
} as const;

export const Radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  full: 9999,
} as const;

export const Typography = {
  // Bundled type: Manrope for Latin and Cairo for Arabic. AppText selects the script family.
  fontLatin:  'Manrope',
  fontArabic: 'Cairo',
  fontMono:   'monospace',

  // Sizes
  xs:   11,
  sm:   13,
  base: 15,
  md:   17,
  lg:   20,
  xl:   24,
  xxl:  30,
  xxxl: 36,
  display: 40,
} as const;

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 15,
    elevation: 12,
  },
  glow: {
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;
