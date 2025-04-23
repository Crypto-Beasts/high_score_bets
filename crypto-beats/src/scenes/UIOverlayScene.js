import Phaser from "phaser";

export default class UIOverlayScene extends Phaser.Scene {
  constructor() {
    super({ key: "UIOverlayScene" });
  }

  create() {
    const { width, height } = this.scale;

    // Ensure the asset is available before adding it
    if (this.textures.exists("fullscreen")) {
      let fullScreenButton = this.add.image(width - 50, 50, "fullscreen").setInteractive();
      fullScreenButton.setScale(0.3).setDepth(10);

      fullScreenButton.on("pointerdown", () => {
        this.scale.isFullscreen ? this.scale.stopFullscreen() : this.scale.startFullscreen();
      });

      this.scene.bringToTop();
    } else {
      console.warn("Fullscreen image not found in cache!");
    }
  }
}
