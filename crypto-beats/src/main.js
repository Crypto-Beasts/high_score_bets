import Phaser from "phaser";
import LoadingScene from "./scenes/LoadingScene.js";
import MainMenuScene from "./scenes/MainMenuScene.js";
import GameScene from "./scenes/GameScene.js";

const config = {
  type: Phaser.AUTO,
  width: 1200,
  height: 800,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [LoadingScene, MainMenuScene, GameScene],
};

const game = new Phaser.Game(config);
