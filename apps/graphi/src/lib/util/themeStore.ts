// Theme Store — User-selectable diagram themes with live preview
// Stores built-in and custom themes in localStorage

import { get, writable } from 'svelte/store';

export interface DiagramTheme {
  id: string;
  name: string;
  description: string;
  type: 'light' | 'dark';
  preview: string; // emoji or icon (legacy, now using calculated swatches)
  mermaidThemeVariables: Record<string, string>;
  customCSS?: string;
  isBuiltIn: boolean;
}

const STORAGE_KEY = 'graphi-themes';
const ACTIVE_THEME_KEY = 'graphi-active-theme';

// Helper to define explicit colors for the "Default" theme so previews work
const defaultVariables = {
  fontFamily: 'rubik, sans-serif',
  lineColor: '#333333',
  primaryColor: '#ECECFF',
  primaryTextColor: '#333333',
  secondaryColor: '#ffffde',
  tertiaryColor: '#fff'
};

// Built-in themes
const builtInThemes: DiagramTheme[] = [
  {
    description: 'Standard Mermaid look',
    id: 'default',
    isBuiltIn: true,
    mermaidThemeVariables: { ...defaultVariables }, // Explicitly set for preview
    name: 'Default',
    preview: '⬜',
    type: 'light'
  },
  {
    description: 'Subtle and professional',
    id: 'neutral',
    isBuiltIn: true,
    mermaidThemeVariables: {
      lineColor: '#666',
      primaryColor: '#eee',
      primaryTextColor: '#333',
      secondaryColor: '#f4f4f4',
      theme: 'neutral'
    },
    name: 'Neutral',
    preview: '📄',
    type: 'light'
  },
  {
    description: 'Nature-inspired greens',
    id: 'forest',
    isBuiltIn: true,
    mermaidThemeVariables: {
      lineColor: '#444',
      primaryColor: '#cde498',
      primaryTextColor: '#131313',
      secondaryColor: '#cdffb2',
      theme: 'forest'
    },
    name: 'Forest',
    preview: '🌲',
    type: 'light'
  },
  {
    description: 'Classic dark theme',
    id: 'dark',
    isBuiltIn: true,
    mermaidThemeVariables: {
      lineColor: '#9ca3af',
      primaryColor: '#1f2937',
      primaryTextColor: '#f3f4f6',
      secondaryColor: '#374151',
      theme: 'dark'
    },
    name: 'Dark Mode',
    preview: '⬛',
    type: 'dark'
  },
  {
    description: 'Famous vampire theme',
    id: 'dracula',
    isBuiltIn: true,
    mermaidThemeVariables: {
      lineColor: '#f1fa8c',
      noteBkgColor: '#f1fa8c',
      noteTextColor: '#282a36',
      primaryBorderColor: '#6272a4',
      primaryColor: '#bd93f9',
      primaryTextColor: '#f8f8f2',
      secondaryColor: '#282a36',
      tertiaryColor: '#44475a',
      theme: 'base'
    },
    name: 'Dracula',
    preview: '🧛',
    type: 'dark'
  },
  {
    description: 'Code editor classic',
    id: 'monokai',
    isBuiltIn: true,
    mermaidThemeVariables: {
      lineColor: '#66d9ef',
      primaryBorderColor: '#a6e22e',
      primaryColor: '#a6e22e',
      primaryTextColor: '#f8f8f2',
      secondaryColor: '#272822',
      tertiaryColor: '#75715e',
      theme: 'base'
    },
    name: 'Monokai',
    preview: '🎨',
    type: 'dark'
  },
  {
    description: 'Neon lights & darkness',
    id: 'cyberpunk',
    isBuiltIn: true,
    mermaidThemeVariables: {
      fontFamily: 'Courier New, monospace',
      lineColor: '#ffee00',
      primaryBorderColor: '#ff00ff',
      primaryColor: '#ff00ff',
      primaryTextColor: '#00ffff',
      secondaryColor: '#091833',
      tertiaryColor: '#133e7c',
      theme: 'base'
    },
    name: 'Cyberpunk',
    preview: '💜',
    type: 'dark'
  },
  {
    description: 'Arctic blue palette',
    id: 'nord',
    isBuiltIn: true,
    mermaidThemeVariables: {
      lineColor: '#88c0d0',
      primaryBorderColor: '#81a1c1',
      primaryColor: '#81a1c1',
      primaryTextColor: '#eceff4',
      secondaryColor: '#2e3440',
      tertiaryColor: '#3b4252',
      theme: 'base'
    },
    name: 'Nord',
    preview: '❄️',
    type: 'dark'
  },
  {
    description: 'Warm light theme',
    id: 'solarized-light',
    isBuiltIn: true,
    mermaidThemeVariables: {
      lineColor: '#586e75',
      primaryBorderColor: '#b58900',
      primaryColor: '#eee8d5',
      primaryTextColor: '#657b83',
      secondaryColor: '#fdf6e3',
      tertiaryColor: '#93a1a1',
      theme: 'base'
    },
    name: 'Solarized Light',
    preview: '☀️',
    type: 'light'
  },
  {
    description: 'Retro 80s aesthetics',
    id: 'synthwave',
    isBuiltIn: true,
    mermaidThemeVariables: {
      lineColor: '#05ffa1',
      primaryBorderColor: '#01cdfe',
      primaryColor: '#ff71ce',
      primaryTextColor: '#fff',
      secondaryColor: '#241734',
      tertiaryColor: '#b967ff',
      theme: 'base'
    },
    name: 'Synthwave',
    preview: '🌅',
    type: 'dark'
  }
];

function loadCustomThemes(): DiagramTheme[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function persistCustomThemes(themes: DiagramTheme[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
}

function loadActiveThemeId(): string {
  return localStorage.getItem(ACTIVE_THEME_KEY) || 'default';
}

// Stores
export const customThemes = writable<DiagramTheme[]>(loadCustomThemes());
export const activeThemeId = writable<string>(loadActiveThemeId());

// Derived: all themes (built-in + custom)
export function getAllThemes(): DiagramTheme[] {
  return [...builtInThemes, ...get(customThemes)];
}

export function getActiveTheme(): DiagramTheme {
  const id = get(activeThemeId);
  const all = getAllThemes();
  return all.find((t) => t.id === id) || builtInThemes[0];
}

export function setActiveTheme(id: string): void {
  activeThemeId.set(id);
  localStorage.setItem(ACTIVE_THEME_KEY, id);
}

export function addCustomTheme(theme: Omit<DiagramTheme, 'id' | 'isBuiltIn'>): void {
  const newTheme: DiagramTheme = {
    ...theme,
    id: 'custom-' + Date.now().toString(36),
    isBuiltIn: false
  };

  customThemes.update((themes) => {
    const updated = [...themes, newTheme];
    persistCustomThemes(updated);
    return updated;
  });
}

export function removeCustomTheme(id: string): void {
  customThemes.update((themes) => {
    const updated = themes.filter((t) => t.id !== id);
    persistCustomThemes(updated);
    return updated;
  });

  // If the deleted theme was active, reset to default
  if (get(activeThemeId) === id) {
    setActiveTheme('default');
  }
}

export function getMermaidThemeConfig(theme: DiagramTheme): Record<string, unknown> {
  const config: Record<string, unknown> = {};

  if (theme.mermaidThemeVariables.theme) {
    config.theme = theme.mermaidThemeVariables.theme;
  } else {
    config.theme = 'base';
  }

  // Extract theme variables (everything except 'theme')
  const vars = { ...theme.mermaidThemeVariables };
  delete vars.theme;

  if (Object.keys(vars).length > 0) {
    config.themeVariables = vars;
  }

  return config;
}

export function applyThemeToConfig(currentConfigStr: string, theme: DiagramTheme): string {
  try {
    let currentConfig = JSON.parse(currentConfigStr || '{}');

    // Guard against double-stringified values: if parse returns a string, parse again
    if (typeof currentConfig === 'string') {
      try {
        currentConfig = JSON.parse(currentConfig);
      } catch {
        currentConfig = {};
      }
    }

    // Final safety: ensure we have a plain object before spreading
    if (
      typeof currentConfig !== 'object' ||
      currentConfig === null ||
      Array.isArray(currentConfig)
    ) {
      currentConfig = {};
    }

    const themeConfig = getMermaidThemeConfig(theme);

    // Merge theme config into current config
    const newConfig = {
      ...currentConfig,
      ...themeConfig
    };

    return JSON.stringify(newConfig, null, 2);
  } catch {
    return currentConfigStr;
  }
}

export { builtInThemes };
