/**
 * Responsive design utilities for scaling UI elements based on screen size
 */

export interface ResponsivePadding {
  x: number;
  y: number;
}

export interface CardDimensions {
  width: number;
  height: number;
  spacing: number;
}

export interface ButtonSize {
  fontSize: string;
  padding: ResponsivePadding;
}

/**
 * Calculate responsive font size based on screen width
 * @param baseSize - Base font size for 1920px width
 * @param screenWidth - Current screen width
 * @param minSize - Minimum font size (optional)
 * @param maxSize - Maximum font size (optional)
 * @returns Font size string (e.g., "24px")
 */
export function getResponsiveFontSize(
  baseSize: number,
  screenWidth: number,
  minSize: number | null = null,
  maxSize: number | null = null
): string {
  const baseWidth = 1920; // Reference width
  const scale = screenWidth / baseWidth;
  let fontSize = baseSize * scale;
  
  if (minSize !== null) {
    fontSize = Math.max(fontSize, minSize);
  }
  if (maxSize !== null) {
    fontSize = Math.min(fontSize, maxSize);
  }
  
  return `${Math.round(fontSize)}px`;
}

/**
 * Calculate responsive spacing based on screen height
 * @param baseSpacing - Base spacing for 1080px height
 * @param screenHeight - Current screen height
 * @returns Responsive spacing value
 */
export function getResponsiveSpacing(baseSpacing: number, screenHeight: number): number {
  const baseHeight = 1080; // Reference height
  const scale = screenHeight / baseHeight;
  return Math.round(baseSpacing * scale);
}

/**
 * Calculate responsive padding
 * @param basePadding - Base padding value
 * @param screenWidth - Current screen width
 * @param screenHeight - Current screen height
 * @returns Responsive padding object
 */
export function getResponsivePadding(
  basePadding: number,
  screenWidth: number,
  screenHeight: number
): ResponsivePadding {
  const baseWidth = 1920;
  const baseHeight = 1080;
  const scaleX = screenWidth / baseWidth;
  const scaleY = screenHeight / baseHeight;
  const avgScale = (scaleX + scaleY) / 2; // Average scale for padding
  
  return {
    x: Math.round(basePadding * scaleX),
    y: Math.round(basePadding * avgScale)
  };
}

/**
 * Get responsive card dimensions
 * @param screenWidth - Current screen width
 * @param screenHeight - Current screen height
 * @returns Card dimensions
 */
export function getResponsiveCardSize(
  screenWidth: number,
  screenHeight: number
): CardDimensions {
  const baseWidth = 1920;
  const baseHeight = 1080;
  
  // Card width: 70% of screen or max 600px
  const cardWidth = Math.min(screenWidth * 0.7, 600 * (screenWidth / baseWidth));
  // Card height: responsive to screen height
  const cardHeight = 150 * (screenHeight / baseHeight);
  // Spacing between cards
  const cardSpacing = 180 * (screenHeight / baseHeight);
  
  return {
    width: Math.round(cardWidth),
    height: Math.round(cardHeight),
    spacing: Math.round(cardSpacing)
  };
}

/**
 * Check if screen is mobile/tablet size
 * @param screenWidth - Current screen width
 * @returns True if mobile/tablet
 */
export function isMobile(screenWidth: number): boolean {
  return screenWidth < 768;
}

/**
 * Check if screen is tablet size
 * @param screenWidth - Current screen width
 * @returns True if tablet
 */
export function isTablet(screenWidth: number): boolean {
  return screenWidth >= 768 && screenWidth < 1024;
}

/**
 * Get responsive button size
 * @param screenWidth - Current screen width
 * @param screenHeight - Current screen height
 * @returns Button size
 */
export function getResponsiveButtonSize(
  screenWidth: number,
  screenHeight: number
): ButtonSize {
  const fontSize = getResponsiveFontSize(32, screenWidth, 20, 40);
  const padding = getResponsivePadding(20, screenWidth, screenHeight);
  
  return {
    fontSize,
    padding
  };
}

/**
 * Get responsive title size
 * @param screenWidth - Current screen width
 * @returns Font size string
 */
export function getResponsiveTitleSize(screenWidth: number): string {
  return getResponsiveFontSize(48, screenWidth, 32, 64);
}

/**
 * Get responsive subtitle size
 * @param screenWidth - Current screen width
 * @returns Font size string
 */
export function getResponsiveSubtitleSize(screenWidth: number): string {
  return getResponsiveFontSize(28, screenWidth, 20, 36);
}

/**
 * Get responsive body text size
 * @param screenWidth - Current screen width
 * @returns Font size string
 */
export function getResponsiveBodySize(screenWidth: number): string {
  return getResponsiveFontSize(24, screenWidth, 16, 28);
}

