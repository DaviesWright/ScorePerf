// ==============================================================================
// ScoReview Enterprise Design System: Tokens & Typography Standards
// Aesthetic: "Linear meets Notion" — Modern, Minimal, High-Contrast
// Palette: Deep Indigo (Trust), Emerald Green (Growth), Soft Peach (Wellness)
// ==============================================================================

const isStaging = typeof window !== "undefined" && window.location.hostname.includes("staging");

export const colors = {
  // Base & Surface (Clean white / light gray canvas)
  bgApp: "#f7f6f3",          // Warm paper canvas
  surface: "#ffffff",        // Card and panel surface
  surfaceSubtle: "#f2f1ed",  // Table headers / secondary backgrounds
  surfaceHover: "#f7f6f3",   // Row and item hover state
  surfaceActive: "#e9e7e1",  // Clicked / active state

  // Borders & Dividers (quiet hairlines)
  borderSubtle: "#efede8",   // Hairline section dividers
  border: "#e4e1da",         // Card and container borders
  borderStrong: "#c9c5bb",   // Input outlines and distinct separators
  borderFocus: isStaging ? "#0f5c4d" : "#4338ca",    // Primary input focus ring

  // Text Hierarchy (three roles)
  textPrimary: "#1c1b19",    // Headings and values
  textSecondary: "#44423d",  // Body copy and table cell text
  textMuted: "#79756c",      // Subtitles, metadata, timestamps
  textDisabled: "#a8a399",   // Placeholders and inactive elements
  textInverse: "#ffffff",    // Text on accent buttons

  // 1. Deep Indigo (Trust, Authority, Structure)
  // Deep Indigo on hr.bscscoreview.com; Dark Teal accent on staging.bscscoreview.com
  indigoPrimary: isStaging ? "#0b3f35" : "#1e1b4b",  // Deepest Midnight Indigo
  indigoDark: isStaging ? "#0b3f35" : "#312e81",     // Deep Indigo 900 (Sidebar highlights)
  indigoMedium: isStaging ? "#0f5c4d" : "#3730a3",   // Indigo 800
  indigoAccent: isStaging ? "#0f5c4d" : "#4338ca",   // Indigo 700 (Primary buttons)
  indigoAction: isStaging ? "#0f5c4d" : "#4f46e5",   // Electric Indigo 600 (Interactive triggers)
  indigoSubtle: isStaging ? "#e7f0ed" : "#eef2ff",   // Indigo 50 (Accent tint for active rows and soft pills)
  indigoBorder: isStaging ? "#bcd6cd" : "#c7d2fe",   // Indigo hairline border

  // 2. Emerald Green (Growth, Progression, Health)
  emeraldDark: "#047857",    // Emerald 700
  emeraldAccent: "#059669",  // Emerald 600
  emeraldAction: "#10b981",  // Emerald 500
  emeraldSubtle: "#ecfdf5",  // Emerald 50
  emeraldBorder: "#a7f3d0",  // Emerald 200

  // 3. Soft Peach (Warmth, Wellness, Employee Pulse)
  peachDark: "#9a3412",      // Warm Peach / Orange 800
  peachText: "#9a3412",      // High contrast readable peach text
  peachAccent: "#ea580c",    // Warm Peach 600
  peachAction: "#f97316",    // Vibrant Peach 500
  peachSubtle: "#fff7ed",    // Soft Peach 50
  peachWarm: "#ffedd5",      // Warm Peach 100
  peachBorder: "#fed7aa",    // Soft Peach 200

  // Aliases for Existing Module Compatibility
  brandNavy: "#0f172a",      // Deepest Midnight Indigo / Navy
  brandNavyLight: "#1e293b", // Slate 800 sidebar background
  brandBlue: "#4338ca",      // Mapped to Deep Indigo Accent
  brandBlueHover: "#3730a3", // Hover state
  brandBlueSubtle: "#eef2ff",// Indigo 50

  // Semantic States
  success: "#047857",        // Emerald Green (Growth)
  successBg: "#ecfdf5",      // Emerald 50
  successBorder: "#a7f3d0",  // Emerald 200

  warning: "#ea580c",        // Warm Amber / Peach
  warningBg: "#fff7ed",      // Soft Peach 50
  warningBorder: "#fed7aa",  // Soft Peach 200

  error: "#b91c1c",          // Red 700
  errorBg: "#fef2f2",        // Red 50
  errorBorder: "#fecaca",    // Red 200

  info: "#4338ca",           // Deep Indigo 700
  infoBg: "#eef2ff",         // Indigo 50
  infoBorder: "#c7d2fe",     // Indigo 200

  // PMS Framework Signifiers (Design System Addendum §3.2): BSC = blue, OKR = green, MBO = amber.
  // `framework*Accent` is the identity accent (bars, quadrant headers, progress).
  // `framework*` is the badge text shade, darkened so badges clear 4.5:1 on their tint (TC-DS-08).
  frameworkBscAccent: "#2563eb",
  frameworkBsc: "#1d4ed8",
  frameworkBscBg: "#eff6ff",
  frameworkBscBorder: "#bfdbfe",

  frameworkOkrAccent: "#059669",
  frameworkOkr: "#047857",
  frameworkOkrBg: "#ecfdf5",
  frameworkOkrBorder: "#a7f3d0",

  frameworkMboAccent: "#d97706",
  frameworkMbo: "#b45309",
  frameworkMboBg: "#fffbeb",
  frameworkMboBorder: "#fde68a",

  // OKR RAG confidence (§3.3): one palette for ESS, Manager Console and HR Console.
  ragGreen: "#059669",
  ragAmber: "#d97706",
  ragRed: "#dc2626",
};

// Surface differentiation (§3.4): one cue only, a 3px left accent bar on the page header.
export type SurfaceKind = "ess" | "manager" | "hr";
export const surfaceAccent: Record<SurfaceKind, string> = {
  ess: "none",
  manager: `3px solid ${colors.indigoAction}`,
  hr: `3px solid ${colors.textPrimary}`,
};

// Typography (Design System Addendum §2). Inter is self-hosted via next/font and exposed
// as --font-inter / --font-mono; the fallback stack is always present.
export const typography = {
  fontFamily: 'var(--font-inter, "Inter"), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontMono: 'var(--font-mono, "JetBrains Mono"), "SF Mono", Consolas, monospace',
  // Legacy aliases, remapped onto the 1.25 modular scale (no off-scale sizes).
  sizes: {
    xs: "0.75rem",    // 12px  text-small
    sm: "0.875rem",   // 14px  text-body
    base: "0.875rem", // 14px  text-body
    md: "1rem",       // 16px  text-h3
    lg: "1.25rem",    // 20px  text-h2
    xl: "1.5rem",     // 24px  text-h1
    xxl: "2rem",      // 32px  text-display
  },
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
};

// Named text styles (§2.2). Components should prefer these over raw sizes.
type TextStyle = { fontSize: string; fontWeight: number; lineHeight: number; letterSpacing?: string; textTransform?: "uppercase" };
export const text: Record<
  "display" | "h1" | "h2" | "h3" | "body" | "bodyStrong" | "small" | "micro" | "mono",
  TextStyle
> = {
  display: { fontSize: "32px", fontWeight: 700, lineHeight: 1.2 },
  h1: { fontSize: "24px", fontWeight: 600, lineHeight: 1.3 },
  h2: { fontSize: "20px", fontWeight: 600, lineHeight: 1.35 },
  h3: { fontSize: "16px", fontWeight: 600, lineHeight: 1.4 },
  body: { fontSize: "14px", fontWeight: 400, lineHeight: 1.5 },
  bodyStrong: { fontSize: "14px", fontWeight: 600, lineHeight: 1.5 },
  small: { fontSize: "12px", fontWeight: 400, lineHeight: 1.45 },
  micro: { fontSize: "11px", fontWeight: 500, lineHeight: 1.4 },
  mono: { fontSize: "12px", fontWeight: 400, lineHeight: 1.5 },
};

// Framework badge (§2.3): identical on every surface.
export const frameworkBadgeText = {
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.05em",
  textTransform: "uppercase" as const,
};

// Spacing (§4.1): 4px base.
export const space = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "24px",
  6: "32px",
  7: "48px",
  8: "64px",
} as const;

// Motion (§7).
export const motion = {
  fast: "150ms ease-out",
  base: "200ms ease-out",
  slow: "300ms ease-in-out",
  skeleton: "1.5s linear infinite",
};

export const shadows = {
  none: "none",
  xs: "0 1px 1px 0 rgba(28, 27, 25, 0.04)",
  sm: "0 1px 2px 0 rgba(28, 27, 25, 0.05)",
  md: "0 2px 6px 0 rgba(28, 27, 25, 0.06)",
  lg: "0 6px 16px 0 rgba(28, 27, 25, 0.08)",
  drawer: "-4px 0 24px rgba(0, 0, 0, 0.12)",
  modal: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
};

export const radii = {
  sm: "4px",
  md: "8px", // radius-md (§4.3 card anatomy)
  lg: "8px",
  xl: "12px",
  full: "9999px",
};

// Named properties only: never "all", so layout is never animated by accident.
export const transitions = {
  default: "background-color 200ms ease-out, border-color 200ms ease-out, color 200ms ease-out, box-shadow 200ms ease-out, opacity 200ms ease-out",
  fast: "background-color 150ms ease-out, border-color 150ms ease-out, color 150ms ease-out",
};

// Keyboard focus ring: a white gap then Deep Indigo / Teal, visible on every surface.
export const focusRing = isStaging
  ? "0 0 0 2px #ffffff, 0 0 0 4px #0f5c4d"
  : "0 0 0 2px #ffffff, 0 0 0 4px #4338ca";
