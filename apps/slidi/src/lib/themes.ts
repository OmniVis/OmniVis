import type { ThemeId } from "@/store/slidiStore";
export type { ThemeId };

export interface Theme {
  id: ThemeId;
  label: string;
  systemPromptBlock: string;
  sandpackTheme: "light" | "dark";
}

export const THEMES: Record<ThemeId, Theme> = {
  minimal: {
    id: "minimal",
    label: "Minimal",
    systemPromptBlock:
      "STYLE: Minimal / Swiss-design editorial. " +
      "All slide backgrounds MUST use className=\"bg-sl-bg\" and all primary text MUST use className=\"text-sl-text\". " +
      "Use var(--sl-accent) for dividers, borders, and highlights (inline style only). " +
      "Use var(--sl-sub) for secondary / muted text. " +
      "Generous whitespace. No drop shadows. Sans-serif typography.",
    sandpackTheme: "light",
  },
  dark: {
    id: "dark",
    label: "Dark",
    systemPromptBlock:
      "STYLE: Dark theme. " +
      "All slide backgrounds MUST use className=\"bg-sl-bg\" and all primary text MUST use className=\"text-sl-text\". " +
      "Use var(--sl-accent) for borders, highlights, and glows. " +
      "Use var(--sl-sub) for secondary text and subtle borders. " +
      "Clean, modern, minimal shadows. Never use light-colored backgrounds on any slide or container.",
    sandpackTheme: "dark",
  },
  corporate: {
    id: "corporate",
    label: "Corporate",
    systemPromptBlock:
      "STYLE: Corporate / professional. " +
      "All slide backgrounds MUST use className=\"bg-sl-bg\" and all primary text MUST use className=\"text-sl-text\". " +
      "Use var(--sl-accent) for accent bars, borders, and chart fills. " +
      "Use var(--sl-sub) for body text. " +
      "Structured layout. Include data bars or simple SVG charts where appropriate.",
    sandpackTheme: "light",
  },
  cyberpunk: {
    id: "cyberpunk",
    label: "Cyberpunk",
    systemPromptBlock:
      "STYLE: Cyberpunk / futuristic. " +
      "All slide backgrounds MUST use className=\"bg-sl-bg\" and all primary text MUST use className=\"text-sl-text\". " +
      "Use var(--sl-accent) for neon borders, glow effects (drop-shadow Tailwind classes), and highlights. " +
      "Use var(--sl-sub) for secondary neon accents. " +
      "Monospace or condensed display fonts for headings. Sharp geometric layouts, thin neon borders. " +
      "No gradients — flat neon on dark. Text should feel like a terminal or hacker interface.",
    sandpackTheme: "dark",
  },
  modern: {
    id: "modern",
    label: "Modern",
    systemPromptBlock:
      "STYLE: High-end modern / tech. " +
      "All slide backgrounds MUST use className=\"bg-sl-bg\" and all primary text MUST use className=\"text-sl-text\". " +
      "Use var(--sl-accent) for bold headings, borders, and smooth transitions. " +
      "Use var(--sl-sub) for supporting text. " +
      "Implement subtle mesh gradients or soft glassmorphism effects where appropriate. " +
      "Typography should feel like a premium startup (Inter/Geist).",
    sandpackTheme: "light",
  },
  sunset: {
    id: "sunset",
    label: "Sunset",
    systemPromptBlock:
      "STYLE: Warm / vibrant / sunset. " +
      "All slide backgrounds MUST use className=\"bg-sl-bg\" and all primary text MUST use className=\"text-sl-text\". " +
      "Use var(--sl-accent) for vibrant highlights (orange/pink). " +
      "Use var(--sl-sub) for deep warm secondary text. " +
      "Use flowing, organic shapes. Soft shadows and warm gradients. " +
      "Headings should be elegant and welcoming.",
    sandpackTheme: "light",
  },
  forest: {
    id: "forest",
    label: "Forest",
    systemPromptBlock:
      "STYLE: Natural / organic / forest. " +
      "All slide backgrounds MUST use className=\"bg-sl-bg\" and all primary text MUST use className=\"text-sl-text\". " +
      "Use var(--sl-accent) for vibrant green highlights and leaf-like shapes. " +
      "Use var(--sl-sub) for deep mossy secondary text. " +
      "Clean, calm, and breathable layout. Use rounded corners and soft earthy tones.",
    sandpackTheme: "light",
  },
  blueprint: {
    id: "blueprint",
    label: "Blueprint",
    systemPromptBlock:
      "STYLE: Technical / engineering / blueprint. " +
      "All slide backgrounds MUST use className=\"bg-sl-bg\" and all primary text MUST use className=\"text-sl-text\". " +
      "Use var(--sl-accent) for drafting lines, schematics, and technical callouts. " +
      "Use var(--sl-sub) for fine-print technical details. " +
      "Include a subtle 20px grid background (CSS background-image). " +
      "Typography should be monospace or technical sans. Use thin white/light-blue lines for everything.",
    sandpackTheme: "dark",
  },
  brutalist: {
    id: "brutalist",
    label: "Brutalist",
    systemPromptBlock:
      "STYLE: Neo-brutalist / bold / raw. " +
      "All slide backgrounds MUST use className=\"bg-sl-bg\" and all primary text MUST use className=\"text-sl-text\". " +
      "Use var(--sl-accent) for THICK 4px black borders and harsh shadows (box-shadow: 8px 8px 0px 0px #000). " +
      "Use var(--sl-sub) for secondary content. " +
      "No rounded corners. High contrast. Large, loud typography. No gradients. " +
      "Use vibrant, flat blocks of color (yellow, blue, green) as secondary accents.",
    sandpackTheme: "light",
  },
  custom: {
    id: "custom",
    label: "Custom",
    systemPromptBlock:
      "STYLE: Custom user-defined palette. " +
      "All slide backgrounds MUST use className=\"bg-sl-bg\" and all primary text MUST use className=\"text-sl-text\". " +
      "Use var(--sl-accent) for highlights, borders, and accents. " +
      "Use var(--sl-sub) for secondary text. " +
      "Apply the user's chosen aesthetic consistently.",
    sandpackTheme: "dark",
  },
};

/** Per-theme CSS variable values and UI colors. */
export const THEME_STYLES: Record<
  ThemeId,
  {
    bg: string;
    text: string;
    subtext: string;
    accent: string;
    divider: string;
    bullet1: string;
    bullet2: string;
  }
> = {
  minimal: {
    bg: "#ffffff",
    text: "#0f172a",
    subtext: "#64748b",
    accent: "#3b82f6",
    divider: "#0f172a",
    bullet1: "#3b82f6",
    bullet2: "#0f172a",
  },
  dark: {
    bg: "#0f172a",
    text: "#f1f5f9",
    subtext: "#94a3b8",
    accent: "#6366f1",
    divider: "#6366f1",
    bullet1: "#6366f1",
    bullet2: "#94a3b8",
  },
  corporate: {
    bg: "#f0f4ff",
    text: "#1d4ed8",
    subtext: "#374151",
    accent: "#1d4ed8",
    divider: "#1d4ed8",
    bullet1: "#1d4ed8",
    bullet2: "#374151",
  },
  cyberpunk: {
    bg: "#0a0a14",
    text: "#ffffff",
    subtext: "#22d3ee",
    accent: "#e879f9",
    divider: "#e879f9",
    bullet1: "#e879f9",
    bullet2: "#22d3ee",
  },
  modern: {
    bg: "#ffffff",
    text: "#09090b",
    subtext: "#71717a",
    accent: "#09090b",
    divider: "#09090b",
    bullet1: "#09090b",
    bullet2: "#71717a",
  },
  sunset: {
    bg: "#fffcf0",
    text: "#431407",
    subtext: "#9a3412",
    accent: "#f97316",
    divider: "#f97316",
    bullet1: "#f97316",
    bullet2: "#9a3412",
  },
  forest: {
    bg: "#f0fdf4",
    text: "#064e3b",
    subtext: "#065f46",
    accent: "#10b981",
    divider: "#10b981",
    bullet1: "#10b981",
    bullet2: "#065f46",
  },
  blueprint: {
    bg: "#0f172a",
    text: "#93c5fd",
    subtext: "#60a5fa",
    accent: "#3b82f6",
    divider: "#3b82f6",
    bullet1: "#3b82f6",
    bullet2: "#60a5fa",
  },
  brutalist: {
    bg: "#ffffff",
    text: "#000000",
    subtext: "#000000",
    accent: "#000000",
    divider: "#000000",
    bullet1: "#000000",
    bullet2: "#000000",
  },
  custom: {
    bg: "#1e1e2e",
    text: "#cdd6f4",
    subtext: "#a6adc8",
    accent: "#89b4fa",
    divider: "#89b4fa",
    bullet1: "#89b4fa",
    bullet2: "#a6adc8",
  },
};

export interface CustomPalette {
  bg: string;
  text: string;
  accent: string;
  subtext: string;
  divider: string;
  bullet1: string;
  bullet2: string;
}

const CUSTOM_THEME_KEY = "slidi_custom_theme";

const DEFAULT_CUSTOM_PALETTE: CustomPalette = {
  bg: "#1e1e2e",
  text: "#cdd6f4",
  accent: "#89b4fa",
  subtext: "#a6adc8",
  divider: "#89b4fa",
  bullet1: "#89b4fa",
  bullet2: "#a6adc8",
};

export function loadCustomPalette(): CustomPalette {
  if (typeof window === "undefined") return DEFAULT_CUSTOM_PALETTE;
  try {
    const stored = localStorage.getItem(CUSTOM_THEME_KEY);
    if (stored) return { ...DEFAULT_CUSTOM_PALETTE, ...JSON.parse(stored) };
  } catch {/* ignore */}
  return DEFAULT_CUSTOM_PALETTE;
}

export function saveCustomPalette(palette: CustomPalette): void {
  localStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(palette));
}

export function removeCustomPalette(): void {
  localStorage.removeItem(CUSTOM_THEME_KEY);
}

export function applyCustomTheme(palette: CustomPalette): void {
  THEME_STYLES.custom = {
    bg: palette.bg,
    text: palette.text,
    subtext: palette.subtext,
    accent: palette.accent,
    divider: palette.divider,
    bullet1: palette.bullet1,
    bullet2: palette.bullet2,
  };
}
