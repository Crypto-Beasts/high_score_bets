/**
 * Error handling utilities for Crypto Beats
 */

/**
 * Validate JSON structure for song data
 * @param {any} data - The JSON data to validate
 * @param {string} songId - Song ID for error messages
 * @returns {{valid: boolean, notes: Array, error: string|null}}
 */
export function validateSongData(data, songId = "unknown") {
  // Handle new format with metadata
  if (data && typeof data === 'object' && data.notes) {
    data = data.notes;
  }
  
  // Check if data is an array
  if (!Array.isArray(data)) {
    return {
      valid: false,
      notes: [],
      error: `Invalid song data format for ${songId}: Expected array, got ${typeof data}`
    };
  }
  
  // Validate each note
  const validKeys = ['W', 'A', 'S', 'D'];
  const errors = [];
  
  for (let i = 0; i < data.length; i++) {
    const note = data[i];
    
    if (!note || typeof note !== 'object') {
      errors.push(`Note ${i}: Must be an object`);
      continue;
    }
    
    // Check required fields
    if (typeof note.time !== 'number') {
      errors.push(`Note ${i}: Missing or invalid 'time' field`);
    }
    
    if (!validKeys.includes(note.key)) {
      errors.push(`Note ${i}: Invalid key '${note.key}', must be one of ${validKeys.join(', ')}`);
    }
    
    if (typeof note.duration !== 'number' || note.duration <= 0) {
      errors.push(`Note ${i}: Missing or invalid 'duration' field`);
    }
    
    if (typeof note.hold !== 'boolean') {
      errors.push(`Note ${i}: Missing or invalid 'hold' field`);
    }
  }
  
  if (errors.length > 0) {
    return {
      valid: false,
      notes: [],
      error: `Validation errors for ${songId}:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... and ${errors.length - 5} more` : ''}`
    };
  }
  
  return {
    valid: true,
    notes: data,
    error: null
  };
}

/**
 * Check if an audio file exists in cache
 * @param {Phaser.Scene} scene - The scene to check cache
 * @param {string} audioKey - The cache key for the audio
 * @returns {boolean}
 */
export function audioExists(scene, audioKey) {
  if (!scene || !scene.cache) return false;
  return scene.cache.audio.exists(audioKey);
}

/**
 * Check if JSON data exists in cache
 * @param {Phaser.Scene} scene - The scene to check cache
 * @param {string} jsonKey - The cache key for the JSON
 * @returns {boolean}
 */
export function jsonExists(scene, jsonKey) {
  if (!scene || !scene.cache) return false;
  return scene.cache.json.exists(jsonKey);
}

/**
 * Get fallback song ID
 * @param {Array} songs - Array of available songs
 * @returns {string|null}
 */
export function getFallbackSong(songs) {
  if (!songs || songs.length === 0) return null;
  return songs[0].id;
}

/**
 * Show user-friendly error message
 * @param {Phaser.Scene} scene - The scene to show error in
 * @param {string} message - Error message
 * @param {Function} onClose - Callback when error is closed
 */
export function showError(scene, message, onClose = null) {
  const { width, height } = scene.scale;
  
  // Create error background
  const errorBg = scene.add.rectangle(width / 2, height / 2, width * 0.8, height * 0.4, 0x000000, 0.9);
  errorBg.setStrokeStyle(4, 0xff0000);
  
  // Error title
  const title = scene.add.text(width / 2, height / 2 - 100, "Error", {
    fontSize: "36px",
    fill: "#ff0000",
    fontStyle: "bold"
  }).setOrigin(0.5);
  
  // Error message (wrap if too long)
  const maxWidth = width * 0.7;
  const errorText = scene.add.text(width / 2, height / 2, message, {
    fontSize: "20px",
    fill: "#ffffff",
    wordWrap: { width: maxWidth }
  }).setOrigin(0.5);
  
  // Close button
  const closeButton = scene.add.rectangle(width / 2, height / 2 + 100, 150, 50, 0x555555, 1)
    .setInteractive();
  
  const closeText = scene.add.text(width / 2, height / 2 + 100, "OK", {
    fontSize: "24px",
    fill: "#ffffff",
    fontStyle: "bold"
  }).setOrigin(0.5);
  
  closeButton.on("pointerdown", () => {
    errorBg.destroy();
    title.destroy();
    errorText.destroy();
    closeButton.destroy();
    closeText.destroy();
    if (onClose) onClose();
  });
  
  closeButton.on("pointerover", () => {
    closeButton.setFillStyle(0x666666, 1);
  });
  
  closeButton.on("pointerout", () => {
    closeButton.setFillStyle(0x555555, 1);
  });
}

/**
 * Log error for debugging
 * @param {string} context - Context where error occurred
 * @param {Error|string} error - Error object or message
 */
export function logError(context, error) {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : '';
  
  console.error(`[${timestamp}] [${context}] Error:`, errorMessage);
  if (errorStack) {
    console.error(`[${timestamp}] [${context}] Stack:`, errorStack);
  }
}

