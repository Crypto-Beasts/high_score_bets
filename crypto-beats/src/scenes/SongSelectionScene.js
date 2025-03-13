import Phaser from "phaser";

export default class SongSelectionScene extends Phaser.Scene {
  constructor() {
    super({ key: "SongSelectionScene" });
    this.selectedSong = null;
    this.selectedMusic = null;
  }

  create() {
    const { width, height } = this.scale;

    // Background fills screen
    this.add.image(width / 2, height / 2, "background").setDisplaySize(width, height);

    // Scene Title
    this.add.text(width / 2, height / 6, "Select a Song", {
      fontSize: "40px",
      fill: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    // Song selection function
    const selectSong = (songKey, button) => {
      if (this.selectedMusic) {
        this.selectedMusic.stop();
      }
      this.selectedMusic = this.sound.add(songKey, { loop: true, volume: 0.5 });
      this.selectedMusic.play();
      this.selectedSong = songKey;

      // Reset all buttons and highlight the selected one
      songButton.setBackgroundColor("#008CBA");
      songTwoButton.setBackgroundColor("#008CBA");
      button.setBackgroundColor("#00FF00"); // Highlight selected song
    };

    // Placeholder Song Option
    let songButton = this.add.text(width / 2, height / 2, "Aguado Menuet (A Minor)", {
      fontSize: "28px",
      fill: "#ffffff",
      backgroundColor: "#008CBA",
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    songButton.on("pointerdown", () => {
      selectSong("Aguado_Menuet_Aminor", songButton);
    });

    let songTwoButton = this.add.text(width / 2, height / 2 + 60, "Windy Summer", {
      fontSize: "28px",
      fill: "#ffffff",
      backgroundColor: "#008CBA",
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    songTwoButton.on("pointerdown", () => {
      selectSong("Windy_Summer", songTwoButton);
    });

    // Ready Button
    let readyButton = this.add.text(width / 2, height / 2 + 120, "Ready", {
      fontSize: "28px",
      fill: "#ffffff",
      backgroundColor: "#00AA00",
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    readyButton.on("pointerdown", () => {
      if (this.selectedMusic) {
        this.selectedMusic.stop();
      }
      if (this.selectedSong) {
        this.scene.start("GameScene", { song: this.selectedSong });
      }
    });

    // Back Button
    let backButton = this.add.text(width / 2, height - 100, "Back", {
      fontSize: "28px",
      fill: "#ffffff",
      backgroundColor: "#555",
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    backButton.on("pointerdown", () => {
      if (this.selectedMusic && this.selectedMusic.isPlaying) {
          this.selectedMusic.pause(); // Pause instead of stopping
      }
      this.scene.start("MainMenuScene");
    });
  
  }
}
