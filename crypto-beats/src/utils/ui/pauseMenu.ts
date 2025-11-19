/**
 * Pause Menu - Handles pause UI and state management
 */

import Phaser from "phaser";
import { getResponsiveFontSize, getResponsiveSpacing } from "./responsive";

export interface PauseMenuConfig {
  scene: Phaser.Scene;
  music?: Phaser.Sound.BaseSound;
  musicStarted?: boolean;
  onResume?: () => void;
  onQuit?: () => void;
}

export interface PauseMenuUI {
  overlay?: Phaser.GameObjects.Rectangle;
  title?: Phaser.GameObjects.Text;
  resumeButton?: Phaser.GameObjects.Text;
  quitButton?: Phaser.GameObjects.Text;
}

export class PauseMenu {
  private scene: Phaser.Scene;
  private music?: Phaser.Sound.BaseSound;
  private musicStarted?: boolean;
  private onResume?: () => void;
  private onQuit?: () => void;

  public isPaused: boolean = false;
  public pauseMenu: PauseMenuUI | null = null;

  constructor(config: PauseMenuConfig) {
    this.scene = config.scene;
    this.music = config.music;
    this.musicStarted = config.musicStarted;
    this.onResume = config.onResume;
    this.onQuit = config.onQuit;
  }

  /**
   * Update music reference
   */
  updateMusic(music?: Phaser.Sound.BaseSound, musicStarted?: boolean): void {
    this.music = music;
    this.musicStarted = musicStarted;
  }

  /**
   * Pause the game
   */
  pauseGame(): void {
    if (this.isPaused || !this.musicStarted) return;
    
    this.isPaused = true;
    if (this.music && this.music.isPlaying) {
      this.music.pause();
    }
    this.scene.scene.pause(this.scene.scene.key);
    
    // Create pause menu overlay
    this.createPauseMenu();
  }

  /**
   * Resume the game
   */
  resumeGame(): void {
    if (!this.isPaused) return;
    
    this.isPaused = false;
    if (this.music && this.music.isPaused) {
      this.music.resume();
    }
    this.scene.scene.resume(this.scene.scene.key);
    
    // Remove pause menu
    if (this.pauseMenu) {
      if (this.pauseMenu.overlay) this.pauseMenu.overlay.destroy();
      if (this.pauseMenu.title) this.pauseMenu.title.destroy();
      if (this.pauseMenu.resumeButton) this.pauseMenu.resumeButton.destroy();
      if (this.pauseMenu.quitButton) this.pauseMenu.quitButton.destroy();
      this.pauseMenu = null;
    }

    if (this.onResume) {
      this.onResume();
    }
  }

  /**
   * Create pause menu UI
   */
  createPauseMenu(): void {
    const { width, height } = this.scene.scale;
    
    // Dark overlay
    const overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    
    // Pause title
    const titleSize = getResponsiveFontSize(48, width, 36, 60);
    const title = this.scene.add.text(width / 2, height / 2 - getResponsiveSpacing(100, height), "PAUSED", {
      fontSize: titleSize,
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);
    
    // Resume button
    const buttonSize = getResponsiveFontSize(24, width, 18, 30);
    const resumeButton = this.scene.add.text(width / 2, height / 2, "Resume (ESC)", {
      fontSize: buttonSize,
      color: "#ffffff",
      backgroundColor: "#00aa00",
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();
    
    resumeButton.on("pointerdown", () => {
      this.resumeGame();
    });
    
    // Quit button
    const quitButton = this.scene.add.text(width / 2, height / 2 + getResponsiveSpacing(60, height), "Quit to Menu", {
      fontSize: buttonSize,
      color: "#ffffff",
      backgroundColor: "#aa0000",
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();
    
    quitButton.on("pointerdown", () => {
      if (this.music) {
        this.music.stop();
      }
      if (this.onQuit) {
        this.onQuit();
      }
    });
    
    // Store references
    this.pauseMenu = {
      overlay,
      title,
      resumeButton,
      quitButton
    };
  }
}

