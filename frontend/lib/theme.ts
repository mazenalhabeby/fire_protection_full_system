/**
 * Centralized Theme Configuration
 * ================================
 *
 * HOW TO CHANGE THE APP'S COLOR SCHEME:
 *
 * 1. QUICK WAY (CSS Variables):
 *    Edit /styles/globals.css - change the values in the :root section:
 *    - --brand-primary-500: #f97316  (main orange color)
 *    - --brand-secondary-500: #f59e0b (amber for gradients)
 *    - --brand-accent-500: #f43f5e   (rose for highlights)
 *
 * 2. TAILWIND CLASSES:
 *    Use these classes in your components:
 *    - bg-brand-500, text-brand-600, etc. (primary colors)
 *    - bg-brand-secondary-500, etc. (secondary colors)
 *    - bg-brand-accent-500, etc. (accent colors)
 *
 * 3. UTILITY CLASSES (defined in globals.css):
 *    - gradient-primary: Primary button gradient
 *    - shadow-brand: Primary shadow
 *    - shadow-brand-lg: Larger shadow
 *    - text-gradient-primary: Gradient text
 *    - bg-gradient-icon: Icon background gradient
 *
 * All components use these variables, so changes propagate everywhere.
 */

// =============================================================================
// BRAND COLORS
// =============================================================================
// These are your main brand colors. Change these to update the entire app.

export const brandColors = {
  // Primary brand color (Orange/Amber)
  primary: {
    50: "#fff7ed",
    100: "#ffedd5",
    200: "#fed7aa",
    300: "#fdba74",
    400: "#fb923c",
    500: "#f97316", // Main primary color
    600: "#ea580c",
    700: "#c2410c",
    800: "#9a3412",
    900: "#7c2d12",
    950: "#431407",
  },

  // Secondary brand color (Amber)
  secondary: {
    50: "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b", // Main secondary color
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
    900: "#78350f",
    950: "#451a03",
  },

  // Accent color (Rose/Pink for highlights)
  accent: {
    50: "#fff1f2",
    100: "#ffe4e6",
    200: "#fecdd3",
    300: "#fda4af",
    400: "#fb7185",
    500: "#f43f5e",
    600: "#e11d48",
    700: "#be123c",
    800: "#9f1239",
    900: "#881337",
    950: "#4c0519",
  },
} as const;

// =============================================================================
// SEMANTIC COLORS
// =============================================================================

export const semanticColors = {
  success: {
    light: "#22c55e",
    dark: "#4ade80",
    bg: {
      light: "#f0fdf4",
      dark: "rgba(34, 197, 94, 0.1)",
    },
  },
  danger: {
    light: "#ef4444",
    dark: "#f87171",
    bg: {
      light: "#fef2f2",
      dark: "rgba(239, 68, 68, 0.1)",
    },
  },
  warning: {
    light: "#f59e0b",
    dark: "#fbbf24",
    bg: {
      light: "#fffbeb",
      dark: "rgba(245, 158, 11, 0.1)",
    },
  },
  info: {
    light: "#3b82f6",
    dark: "#60a5fa",
    bg: {
      light: "#eff6ff",
      dark: "rgba(59, 130, 246, 0.1)",
    },
  },
} as const;

// =============================================================================
// GRADIENTS
// =============================================================================
// Define all gradients used in the app

export const gradients = {
  // Primary button gradient
  primaryButton: {
    default: "from-orange-500 via-orange-600 to-amber-500",
    hover: "from-orange-600 via-orange-700 to-amber-600",
  },

  // Card/Section gradients
  card: {
    light: "from-white via-orange-50/50 to-amber-50/30",
    dark: "from-gray-900 via-gray-950 to-black",
  },

  // Background gradients for auth pages
  authBackground: {
    light: "from-white via-orange-50/50 to-amber-50/30",
    dark: "from-gray-900 via-gray-950 to-black",
  },

  // Animated orbs colors
  orbs: {
    light: {
      orb1: "from-orange-200/40 to-amber-100/30",
      orb2: "from-amber-100/40 to-yellow-100/30",
      orb3: "from-rose-100/40 to-orange-100/30",
      orb4: "from-yellow-100/30 to-amber-50/20",
    },
    dark: {
      orb1: "from-orange-500/30 to-amber-500/10",
      orb2: "from-amber-500/20 to-orange-600/10",
      orb3: "from-yellow-500/15 to-orange-500/10",
      orb4: "from-orange-500/5 to-transparent",
    },
  },

  // Text gradients
  text: {
    primary: "from-orange-500 to-amber-500",
    secondary: "from-amber-500 to-yellow-500",
  },
} as const;

// =============================================================================
// SHADOWS
// =============================================================================

export const shadows = {
  // Button shadows
  button: {
    primary: "shadow-orange-500/25",
    primaryHover: "shadow-orange-500/30",
  },

  // Card shadows
  card: {
    light: "shadow-gray-200/50",
    dark: "shadow-black/20",
  },
} as const;

// =============================================================================
// NAVBAR THEME
// =============================================================================

export const navbarTheme = {
  // Background colors
  background: {
    light: "bg-white/80",
    dark: "bg-gray-900/80",
  },

  // Border colors
  border: {
    light: "border-gray-200/50",
    dark: "border-gray-800/50",
  },

  // Link colors
  link: {
    light: {
      default: "text-gray-600",
      hover: "text-gray-900",
      active: "text-orange-500",
    },
    dark: {
      default: "text-gray-300",
      hover: "text-white",
      active: "text-orange-400",
    },
  },
} as const;

// =============================================================================
// BUTTON VARIANTS
// =============================================================================

export const buttonVariants = {
  primary: {
    base: "text-white font-semibold",
    gradient: gradients.primaryButton.default,
    gradientHover: gradients.primaryButton.hover,
    shadow: "shadow-md shadow-orange-500/25",
    shadowHover: "shadow-lg shadow-orange-500/30",
  },

  secondary: {
    light: {
      base: "text-gray-700 font-medium",
      bg: "bg-gray-100",
      bgHover: "bg-gray-200",
      border: "border-gray-200",
    },
    dark: {
      base: "text-gray-200 font-medium",
      bg: "bg-gray-800",
      bgHover: "bg-gray-700",
      border: "border-gray-700",
    },
  },

  ghost: {
    light: {
      base: "text-gray-600",
      hover: "text-gray-900",
      bgHover: "bg-gray-100",
    },
    dark: {
      base: "text-gray-300",
      hover: "text-white",
      bgHover: "bg-gray-800",
    },
  },
} as const;

// =============================================================================
// CARD THEME
// =============================================================================

export const cardTheme = {
  // Auth page cards
  auth: {
    light: {
      bg: "bg-white/80",
      border: "border-white/50",
      shadow: "shadow-2xl shadow-gray-900/10",
    },
    dark: {
      bg: "bg-gray-900/80",
      border: "border-gray-700/50",
      shadow: "shadow-2xl shadow-black/30",
    },
  },

  // General cards
  default: {
    light: {
      bg: "bg-white",
      border: "border-gray-200",
      shadow: "shadow-sm",
    },
    dark: {
      bg: "bg-gray-900",
      border: "border-gray-800",
      shadow: "shadow-sm",
    },
  },
} as const;

// =============================================================================
// INPUT THEME
// =============================================================================

export const inputTheme = {
  light: {
    bg: "bg-white",
    border: "border-gray-300",
    borderFocus: "border-orange-500",
    text: "text-gray-900",
    placeholder: "placeholder-gray-400",
  },
  dark: {
    bg: "bg-gray-800",
    border: "border-gray-700",
    borderFocus: "border-orange-500",
    text: "text-white",
    placeholder: "placeholder-gray-500",
  },
} as const;

// =============================================================================
// ANIMATION DURATIONS
// =============================================================================

export const animations = {
  fast: "duration-150",
  normal: "duration-200",
  slow: "duration-300",
  verySlow: "duration-500",

  // Specific animations
  shimmer: "duration-700",
  blob: "12s",
  float: "6s",
  glow: "4s",
  spin: "20s",
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================

export const borderRadius = {
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl",
  xl: "rounded-2xl",
  full: "rounded-full",
} as const;

// =============================================================================
// Z-INDEX LAYERS
// =============================================================================

export const zIndex = {
  base: "z-0",
  dropdown: "z-10",
  sticky: "z-20",
  fixed: "z-30",
  modalBackdrop: "z-40",
  modal: "z-50",
  popover: "z-50",
  tooltip: "z-50",
} as const;

// =============================================================================
// HELPER: Generate CSS Variables for Tailwind
// =============================================================================

export function getCSSVariables() {
  return {
    // Primary colors
    "--brand-primary-50": brandColors.primary[50],
    "--brand-primary-100": brandColors.primary[100],
    "--brand-primary-200": brandColors.primary[200],
    "--brand-primary-300": brandColors.primary[300],
    "--brand-primary-400": brandColors.primary[400],
    "--brand-primary-500": brandColors.primary[500],
    "--brand-primary-600": brandColors.primary[600],
    "--brand-primary-700": brandColors.primary[700],
    "--brand-primary-800": brandColors.primary[800],
    "--brand-primary-900": brandColors.primary[900],
    "--brand-primary-950": brandColors.primary[950],

    // Secondary colors
    "--brand-secondary-50": brandColors.secondary[50],
    "--brand-secondary-100": brandColors.secondary[100],
    "--brand-secondary-200": brandColors.secondary[200],
    "--brand-secondary-300": brandColors.secondary[300],
    "--brand-secondary-400": brandColors.secondary[400],
    "--brand-secondary-500": brandColors.secondary[500],
    "--brand-secondary-600": brandColors.secondary[600],
    "--brand-secondary-700": brandColors.secondary[700],
    "--brand-secondary-800": brandColors.secondary[800],
    "--brand-secondary-900": brandColors.secondary[900],
    "--brand-secondary-950": brandColors.secondary[950],

    // Accent colors
    "--brand-accent-50": brandColors.accent[50],
    "--brand-accent-100": brandColors.accent[100],
    "--brand-accent-200": brandColors.accent[200],
    "--brand-accent-300": brandColors.accent[300],
    "--brand-accent-400": brandColors.accent[400],
    "--brand-accent-500": brandColors.accent[500],
    "--brand-accent-600": brandColors.accent[600],
    "--brand-accent-700": brandColors.accent[700],
    "--brand-accent-800": brandColors.accent[800],
    "--brand-accent-900": brandColors.accent[900],
    "--brand-accent-950": brandColors.accent[950],
  };
}

// =============================================================================
// EXPORT DEFAULT THEME OBJECT
// =============================================================================

const theme = {
  colors: {
    brand: brandColors,
    semantic: semanticColors,
  },
  gradients,
  shadows,
  navbar: navbarTheme,
  button: buttonVariants,
  card: cardTheme,
  input: inputTheme,
  animations,
  borderRadius,
  zIndex,
  getCSSVariables,
} as const;

export default theme;
