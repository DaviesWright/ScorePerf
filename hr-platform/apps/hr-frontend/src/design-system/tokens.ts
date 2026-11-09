// ==============================================================================
// ScoReview Enterprise Design System: Tokens & Typography Standards
// Aesthetic: "Linear meets Notion" — Modern, Minimal, High-Contrast
// Palette: Deep Indigo (Trust), Emerald Green (Growth), Soft Peach (Wellness)
// ==============================================================================

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
  borderFocus: "#0f5c4d",    // Primary input focus ring (single accent)

  // Text Hierarchy (three roles)
  textPrimary: "#1c1b19",    // Headings and values
  textSecondary: "#44423d",  // Body copy and table cell text
  textMuted: "#79756c",      // Subtitles, metadata, timestamps
  textDisabled: "#a8a399",   // Placeholders and inactive elements
  textInverse: "#ffffff",    // Text on accent buttons

  // 1. Deep Indigo (Trust, Authority, Structure)
  // The single accent. Names kept from the old indigo ramp so every screen picks it up.
  indigoPrimary: "#0b3f35",  // Accent, deepest
  indigoDark: "#0b3f35",     // Accent, deepest (sidebar highlights)
  indigoMedium: "#0f5c4d",   // Accent
  indigoAccent: "#0f5c4d",   // Primary buttons and brand marks
  indigoAction: "#0f5c4d",   // Interactive focus and triggers
  indigoSubtle: "#e7f0ed",   // Accent tint for active rows and soft pills
  indigoBorder: "#bcd6cd",   // Accent hairline

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

  // PMS Framework Signifiers (Strict single-framework identity)
  frameworkOkr: "#6d28d9",   // Purple 700
  frameworkOkrBg: "#faf5ff", // Purple 50
  frameworkOkrBorder: "#e9d5ff",

  frameworkMbo: "#4338ca",   // Deep Indigo 700
  frameworkMboBg: "#eef2ff", // Indigo 50
  frameworkMboBorder: "#c7d2fe",

  frameworkBsc: "#047857",   // Emerald Green 700
  frameworkBscBg: "#ecfdf5", // Emerald 50
  frameworkBscBorder: "#a7f3d0",
};

export const typography = {
  fontFamily: 'Inter, Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
  fontMono: 'Geist Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  sizes: {
    xs: "0.75rem",    // 12px: Metadata, pills, helper labels
    sm: "0.8125rem",  // 13px: Secondary copy, table cell details
    base: "0.875rem", // 14px: Standard enterprise body & table text
    md: "0.9375rem",  // 15px: Primary row titles, input text
    lg: "1.125rem",   // 18px: Card headings, section titles
    xl: "1.375rem",   // 22px: Page titles
    xxl: "1.875rem",  // 30px: Large metric KPI figures
  },
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
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
  md: "6px",
  lg: "8px",
  xl: "12px",
  full: "9999px",
};

// Named properties only: never "all", so layout is never animated by accident.
export const transitions = {
  default: "background-color 160ms cubic-bezier(0.2, 0, 0, 1), border-color 160ms cubic-bezier(0.2, 0, 0, 1), color 160ms cubic-bezier(0.2, 0, 0, 1), box-shadow 160ms cubic-bezier(0.2, 0, 0, 1), opacity 160ms cubic-bezier(0.2, 0, 0, 1)",
  fast: "background-color 100ms ease-out, border-color 100ms ease-out, color 100ms ease-out",
};

// Keyboard focus ring: a white gap then Deep Indigo, visible on every surface.
export const focusRing = "0 0 0 2px #ffffff, 0 0 0 4px #0f5c4d";
