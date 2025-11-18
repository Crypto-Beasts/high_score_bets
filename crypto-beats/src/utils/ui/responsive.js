/**
 * Responsive design utilities for scaling UI elements based on screen size
 */

/**
 * Calculate responsive font size based on screen width
 * @param {number} baseSize - Base font size for 1920px width
 * @param {number} screenWidth - Current screen width
 * @param {number} minSize - Minimum font size (optional)
 * @param {number} maxSize - Maximum font size (optional)
 * @returns {string} Font size string (e.g., "24px")
 */
export function getResponsiveFontSize(baseSize, screenWidth, minSize = null, maxSize = null) {
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
 * @param {number} baseSpacing - Base spacing for 1080px height
 * @param {number} screenHeight - Current screen height
 * @returns {number} Responsive spacing value
 */
export function getResponsiveSpacing(baseSpacing, screenHeight) {
  const baseHeight = 1080; // Reference height
  const scale = screenHeight / baseHeight;
  return Math.round(baseSpacing * scale);
}

/**
 * Calculate responsive padding
 * @param {number} basePadding - Base padding value
 * @param {number} screenWidth - Current screen width
 * @param {number} screenHeight - Current screen height
 * @returns {{x: number, y: number}} Responsive padding object
 */
export function getResponsivePadding(basePadding, screenWidth, screenHeight) {
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
 * @param {number} screenWidth - Current screen width
 * @param {number} screenHeight - Current screen height
 * @returns {{width: number, height: number, spacing: number}} Card dimensions
 */
export function getResponsiveCardSize(screenWidth, screenHeight) {
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
 * @param {number} screenWidth - Current screen width
 * @returns {boolean} True if mobile/tablet
 */
export function isMobile(screenWidth) {
  return screenWidth < 768;
}

/**
 * Check if screen is tablet size
 * @param {number} screenWidth - Current screen width
 * @returns {boolean} True if tablet
 */
export function isTablet(screenWidth) {
  return screenWidth >= 768 && screenWidth < 1024;
}

/**
 * Get responsive button size
 * @param {number} screenWidth - Current screen width
 * @param {number} screenHeight - Current screen height
 * @returns {{fontSize: string, padding: {x: number, y: number}}} Button size
 */
export function getResponsiveButtonSize(screenWidth, screenHeight) {
  const fontSize = getResponsiveFontSize(32, screenWidth, 20, 40);
  const padding = getResponsivePadding(20, screenWidth, screenHeight);
  
  return {
    fontSize,
    padding
  };
}

/**
 * Get responsive title size
 * @param {number} screenWidth - Current screen width
 * @returns {string} Font size string
 */
export function getResponsiveTitleSize(screenWidth) {
  return getResponsiveFontSize(48, screenWidth, 32, 64);
}

/**
 * Get responsive subtitle size
 * @param {number} screenWidth - Current screen width
 * @returns {string} Font size string
 */
export function getResponsiveSubtitleSize(screenWidth) {
  return getResponsiveFontSize(28, screenWidth, 20, 36);
}

/**
 * Get responsive body text size
 * @param {number} screenWidth - Current screen width
 * @returns {string} Font size string
 */
export function getResponsiveBodySize(screenWidth) {
  return getResponsiveFontSize(24, screenWidth, 16, 28);
}

