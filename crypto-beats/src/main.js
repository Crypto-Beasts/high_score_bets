import Phaser from "phaser";
// Gameplay scenes
import GameScene from "./scenes/gameplay/GameScene.js";
import DebriefScene from "./scenes/gameplay/DebriefScene.js";
import MultiplayerGameScene from "./scenes/gameplay/MultiplayerGameScene.js";
import MultiplayerDebriefScene from "./scenes/gameplay/MultiplayerDebriefScene.js";
// Menu scenes
import LoadingScene from "./scenes/menus/LoadingScene.js";
import MainMenuScene from "./scenes/menus/MainMenuScene.js";
import SongSelectionScene from "./scenes/menus/SongSelectionScene.js";
import MultiplayerLobbyScene from "./scenes/menus/MultiplayerLobbyScene.js";
import AboutUsScene from "./scenes/menus/AboutUsScene.js";
// Settings scenes
import AudioCalibrationScene from "./scenes/settings/AudioCalibrationScene.js";
import ThemeSelectionScene from "./scenes/settings/ThemeSelectionScene.js";
import AchievementsScene from "./scenes/settings/AchievementsScene.js";
// UI scenes
import UIOverlayScene from "./scenes/ui/UIOverlayScene.js";

const config = {
  type: Phaser.AUTO,
  parent: 'game-container', // Attach to container
  width: window.innerWidth || 1920,
  height: window.innerHeight || 1080,
  backgroundColor: '#000000', // Black background while loading
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [LoadingScene, MainMenuScene, GameScene, DebriefScene, MultiplayerLobbyScene, MultiplayerGameScene, MultiplayerDebriefScene, SongSelectionScene, AboutUsScene, AudioCalibrationScene, ThemeSelectionScene, AchievementsScene, UIOverlayScene],
};

const game = new Phaser.Game(config);

// Handle window resize - game automatically fills the window
let resizeTimeout;
window.addEventListener('resize', () => {
  // Debounce resize events for better performance
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    const newWidth = window.innerWidth || 1920;
    const newHeight = window.innerHeight || 1080;
    
    if (game.scale) {
      game.scale.resize(newWidth, newHeight);
      
      // Manually trigger resize event only on the currently active scene
      // This prevents calling resize on scenes that aren't fully initialized
      const activeScenes = game.scene.getScenes(true);
      const activeScene = activeScenes.find(scene => {
        if (!scene || !scene.scene) return false;
        try {
          return scene.scene.isActive();
        } catch (e) {
          return false;
        }
      });
      
      if (activeScene && typeof activeScene.handleResize === 'function') {
        // Additional safety check: ensure scene has required properties
        if (activeScene.cameras && activeScene.scale) {
          try {
            activeScene.handleResize({ width: newWidth, height: newHeight });
          } catch (error) {
            console.warn(`[Resize] Error in ${activeScene.scene?.key || 'unknown'} handleResize:`, error);
          }
        }
      }
    }
  }, 50); // 50ms debounce for more responsive feel
});

// Start the UIOverlayScene and keep it active across all scenes
// game.scene.start("UIOverlayScene");
