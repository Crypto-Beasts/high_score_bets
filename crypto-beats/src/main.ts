import Phaser from "phaser";
// Gameplay scenes
import GameScene from "./scenes/gameplay/GameScene";
import DebriefScene from "./scenes/gameplay/DebriefScene";
import MultiplayerGameScene from "./scenes/gameplay/MultiplayerGameScene";
import MultiplayerDebriefScene from "./scenes/gameplay/MultiplayerDebriefScene";
// Menu scenes
import LoadingScene from "./scenes/menus/LoadingScene";
import MainMenuScene from "./scenes/menus/MainMenuScene";
import SongSelectionScene from "./scenes/menus/SongSelectionScene";
import MultiplayerLobbyScene from "./scenes/menus/MultiplayerLobbyScene";
import AboutUsScene from "./scenes/menus/AboutUsScene";
// Settings scenes
import AudioCalibrationScene from "./scenes/settings/AudioCalibrationScene";
import ThemeSelectionScene from "./scenes/settings/ThemeSelectionScene";
import AchievementsScene from "./scenes/settings/AchievementsScene";
// UI scenes
import UIOverlayScene from "./scenes/ui/UIOverlayScene";

// Scenes may optionally implement handleResize to reflow their layout on window resize.
type ResizableScene = Phaser.Scene & {
  handleResize?: (size: { width: number; height: number }) => void;
};

const config: Phaser.Types.Core.GameConfig = {
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
let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
window.addEventListener('resize', () => {
  // Debounce resize events for better performance
  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
  }
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
      }) as ResizableScene | undefined;

      if (activeScene && typeof activeScene.handleResize === "function") {
        // Additional safety check: ensure scene has required properties
        if (activeScene.cameras && activeScene.scale) {
          try {
            activeScene.handleResize({ width: newWidth, height: newHeight });
          } catch (error) {
            console.warn(`[Resize] Error in ${activeScene.scene?.key || "unknown"} handleResize:`, error);
          }
        }
      }
    }
  }, 50); // 50ms debounce for more responsive feel
});

// Start the UIOverlayScene and keep it active across all scenes
// game.scene.start("UIOverlayScene");

