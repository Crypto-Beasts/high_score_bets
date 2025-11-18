/**
 * Color Theme System
 * Manages different color schemes for notes, keys, and UI elements
 */

export interface ThemeColors {
  note: number;
  noteGlow: number;
  perfect: number;
  good: number;
  miss: number;
  trail: number[];
  keyGlow: number;
  judgmentLine: number;
}

export interface Theme {
  name: string;
  description: string;
  colors: ThemeColors;
}

export interface ThemeWithKey extends Theme {
  key: string;
}

const STORAGE_KEY = 'cryptoBeats_colorTheme';
const DEFAULT_THEME = 'default';

/**
 * Available color themes
 */
export const COLOR_THEMES: Record<string, Theme> = {
  default: {
    name: 'Default',
    description: 'Classic white notes with green accents',
    colors: {
      note: 0xffffff,           // White notes
      noteGlow: 0x00ff00,       // Green glow
      perfect: 0x00ff00,        // Green for perfect
      good: 0xffff00,          // Yellow for good
      miss: 0xff0000,          // Red for miss
      trail: [0x00ff00, 0x00ffff, 0x0088ff], // Green to cyan trail
      keyGlow: 0x00ff00,       // Green key glow
      judgmentLine: 0xffffff    // White judgment line
    }
  },
  neon: {
    name: 'Neon',
    description: 'Vibrant neon colors',
    colors: {
      note: 0xff00ff,           // Magenta notes
      noteGlow: 0x00ffff,      // Cyan glow
      perfect: 0x00ffff,       // Cyan for perfect
      good: 0xff00ff,          // Magenta for good
      miss: 0xff0080,          // Pink for miss
      trail: [0xff00ff, 0x00ffff, 0xff0080], // Magenta to cyan trail
      keyGlow: 0x00ffff,       // Cyan key glow
      judgmentLine: 0xff00ff    // Magenta judgment line
    }
  },
  fire: {
    name: 'Fire',
    description: 'Warm fire colors',
    colors: {
      note: 0xff6600,          // Orange notes
      noteGlow: 0xff3300,      // Red-orange glow
      perfect: 0xff3300,       // Red-orange for perfect
      good: 0xff9900,          // Orange for good
      miss: 0xcc0000,          // Dark red for miss
      trail: [0xff6600, 0xff3300, 0xff9900], // Orange to red trail
      keyGlow: 0xff3300,       // Red-orange key glow
      judgmentLine: 0xff6600    // Orange judgment line
    }
  },
  ice: {
    name: 'Ice',
    description: 'Cool ice blue colors',
    colors: {
      note: 0x00ccff,          // Light blue notes
      noteGlow: 0x0099ff,      // Blue glow
      perfect: 0x00ccff,       // Light blue for perfect
      good: 0x66ccff,          // Sky blue for good
      miss: 0x0066cc,          // Dark blue for miss
      trail: [0x00ccff, 0x0099ff, 0x66ccff], // Blue gradient trail
      keyGlow: 0x00ccff,       // Light blue key glow
      judgmentLine: 0x00ccff    // Light blue judgment line
    }
  },
  purple: {
    name: 'Purple',
    description: 'Royal purple theme',
    colors: {
      note: 0x9966ff,          // Purple notes
      noteGlow: 0xcc99ff,     // Light purple glow
      perfect: 0xcc99ff,      // Light purple for perfect
      good: 0x9966ff,          // Purple for good
      miss: 0x6600cc,          // Dark purple for miss
      trail: [0x9966ff, 0xcc99ff, 0xcc66ff], // Purple gradient trail
      keyGlow: 0xcc99ff,       // Light purple key glow
      judgmentLine: 0x9966ff    // Purple judgment line
    }
  },
  matrix: {
    name: 'Matrix',
    description: 'Green matrix style',
    colors: {
      note: 0x00ff00,          // Green notes
      noteGlow: 0x00ff88,      // Bright green glow
      perfect: 0x00ff88,       // Bright green for perfect
      good: 0x00ff00,          // Green for good
      miss: 0x008800,          // Dark green for miss
      trail: [0x00ff00, 0x00ff88, 0x88ff00], // Green matrix trail
      keyGlow: 0x00ff88,       // Bright green key glow
      judgmentLine: 0x00ff00    // Green judgment line
    }
  }
};

/**
 * Get current theme from localStorage
 * @returns Theme key
 */
export function getCurrentTheme(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && COLOR_THEMES[stored]) {
      return stored;
    }
  } catch (error) {
    console.warn('[colorThemes] Error reading theme from localStorage:', error);
  }
  return DEFAULT_THEME;
}

/**
 * Set theme in localStorage
 * @param themeKey - Theme key to set
 * @returns True if successful
 */
export function setTheme(themeKey: string): boolean {
  try {
    if (COLOR_THEMES[themeKey]) {
      localStorage.setItem(STORAGE_KEY, themeKey);
      return true;
    }
  } catch (error) {
    console.warn('[colorThemes] Error saving theme to localStorage:', error);
  }
  return false;
}

/**
 * Get theme colors object
 * @param themeKey - Optional theme key, uses current if not provided
 * @returns Theme colors object
 */
export function getThemeColors(themeKey: string | null = null): ThemeColors {
  const key = themeKey || getCurrentTheme();
  return COLOR_THEMES[key]?.colors || COLOR_THEMES[DEFAULT_THEME].colors;
}

/**
 * Get theme object
 * @param themeKey - Optional theme key, uses current if not provided
 * @returns Full theme object
 */
export function getTheme(themeKey: string | null = null): Theme {
  const key = themeKey || getCurrentTheme();
  return COLOR_THEMES[key] || COLOR_THEMES[DEFAULT_THEME];
}

/**
 * Get all available themes
 * @returns Array of theme objects with keys
 */
export function getAllThemes(): ThemeWithKey[] {
  return Object.keys(COLOR_THEMES).map(key => ({
    key,
    ...COLOR_THEMES[key]
  }));
}

