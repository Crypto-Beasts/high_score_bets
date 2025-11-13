import Phaser from "phaser";
import LoadingScene from "./scenes/LoadingScene.js";
import MainMenuScene from "./scenes/MainMenuScene.js";
import GameScene from "./scenes/GameScene.js";
import DebriefScene from "./scenes/DebriefScene.js";
import SongSelectionScene from "./scenes/SongSelectionScene.js";
import AboutUsScene from "./scenes/AboutUsScene.js";
import UIOverlayScene from "./scenes/UIOverlayScene.js";

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
  scene: [LoadingScene, MainMenuScene, GameScene, DebriefScene, SongSelectionScene, AboutUsScene, UIOverlayScene],
};

const game = new Phaser.Game(config);

// Handle window resize - game automatically fills the window
window.addEventListener('resize', () => {
  if (game.scale) {
    game.scale.resize(window.innerWidth, window.innerHeight);
  }
});

// Start the UIOverlayScene and keep it active across all scenes
// game.scene.start("UIOverlayScene");
