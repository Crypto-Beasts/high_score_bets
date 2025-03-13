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
  width: 1200,
  height: 800,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [LoadingScene, MainMenuScene, GameScene, DebriefScene, SongSelectionScene, AboutUsScene, UIOverlayScene],
};

const game = new Phaser.Game(config);

// Start the UIOverlayScene and keep it active across all scenes
// game.scene.start("UIOverlayScene");
