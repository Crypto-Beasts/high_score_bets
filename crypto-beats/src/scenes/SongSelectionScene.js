import Phaser from "phaser";
import { DIFFICULTY_LEVELS, DIFFICULTY_CONFIG } from "../utils/difficultyManager.js";

export default class SongSelectionScene extends Phaser.Scene {
  constructor() {
    super({ key: "SongSelectionScene" });
    this.selectedSong = null;
    this.selectedMusic = null;
    this.selectedDifficulty = DIFFICULTY_LEVELS.NORMAL; // Default to Normal
  }

  create() {
    const { width, height } = this.scale;

    // Background fills screen
    this.add.image(width / 2, height / 2, "background").setDisplaySize(width, height);

    // Scene Title
    this.add.text(width / 2, height / 8, "Select a Song", {
      fontSize: "40px",
      fill: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    // Difficulty Selection Title
    this.add.text(width / 2, height / 5, "Difficulty", {
      fontSize: "28px",
      fill: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    // Difficulty selection function
    const selectDifficulty = (difficulty, button) => {
      this.selectedDifficulty = difficulty;
      // Reset all difficulty buttons
      easyButton.setBackgroundColor(DIFFICULTY_CONFIG[DIFFICULTY_LEVELS.EASY].color);
      easyButton.setColor("#000000");
      normalButton.setBackgroundColor(DIFFICULTY_CONFIG[DIFFICULTY_LEVELS.NORMAL].color);
      normalButton.setColor("#000000");
      hardButton.setBackgroundColor(DIFFICULTY_CONFIG[DIFFICULTY_LEVELS.HARD].color);
      hardButton.setColor("#ffffff");
      // Highlight selected
      button.setBackgroundColor("#ffffff");
      button.setColor("#000000");
    };

    // Difficulty buttons
    const difficultyY = height / 3.5;
    const difficultySpacing = 80;

    let easyButton = this.add.text(width / 2 - difficultySpacing, difficultyY, "Easy", {
      fontSize: "24px",
      fill: "#000000",
      backgroundColor: DIFFICULTY_CONFIG[DIFFICULTY_LEVELS.EASY].color,
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5).setInteractive();

    easyButton.on("pointerdown", () => {
      selectDifficulty(DIFFICULTY_LEVELS.EASY, easyButton);
    });

    let normalButton = this.add.text(width / 2, difficultyY, "Normal", {
      fontSize: "24px",
      fill: "#000000",
      backgroundColor: DIFFICULTY_CONFIG[DIFFICULTY_LEVELS.NORMAL].color,
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5).setInteractive();

    normalButton.on("pointerdown", () => {
      selectDifficulty(DIFFICULTY_LEVELS.NORMAL, normalButton);
    });

    let hardButton = this.add.text(width / 2 + difficultySpacing, difficultyY, "Hard", {
      fontSize: "24px",
      fill: "#ffffff",
      backgroundColor: DIFFICULTY_CONFIG[DIFFICULTY_LEVELS.HARD].color,
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5).setInteractive();

    hardButton.on("pointerdown", () => {
      selectDifficulty(DIFFICULTY_LEVELS.HARD, hardButton);
    });

    // Highlight default (Normal)
    selectDifficulty(DIFFICULTY_LEVELS.NORMAL, normalButton);

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
    let songButton = this.add.text(width / 2, height / 2.2, "Aguado Menuet (A Minor)", {
      fontSize: "28px",
      fill: "#ffffff",
      backgroundColor: "#008CBA",
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    songButton.on("pointerdown", () => {
      selectSong("Aguado_Menuet_Aminor", songButton);
    });

    let songTwoButton = this.add.text(width / 2, height / 2.2 + 60, "Windy Summer", {
      fontSize: "28px",
      fill: "#ffffff",
      backgroundColor: "#008CBA",
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    songTwoButton.on("pointerdown", () => {
      selectSong("Windy_Summer", songTwoButton);
    });

    // Ready Button
    let readyButton = this.add.text(width / 2, height / 2.2 + 120, "Ready", {
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
        this.scene.start("GameScene", { 
          song: this.selectedSong,
          difficulty: this.selectedDifficulty 
        });
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
