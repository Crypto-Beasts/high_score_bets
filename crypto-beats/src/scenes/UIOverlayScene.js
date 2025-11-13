import Phaser from "phaser";

export default class UIOverlayScene extends Phaser.Scene {
  constructor() {
    super({ key: "UIOverlayScene" });
  }

  create() {
    // UIOverlayScene is kept for potential future overlay elements
    // Fullscreen button removed - game now fills the window automatically
    this.scene.bringToTop();
  }
}
