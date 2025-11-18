/**
 * Opponent Replay System
 * Simulates opponent's gameplay on a mini view
 */

import Phaser from "phaser";
import { getResponsiveSpacing, getResponsiveFontSize } from "../../utils/ui/responsive";

interface OpponentViewArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface OpponentInputData {
  key: string;
  timestamp?: number;
  noteTime?: number;
  quality: string;
}

interface OpponentNoteData {
  key: string;
  time: number;
  isHold?: boolean;
  duration?: number;
}

interface KeyLane {
  x: number;
  sprite: string;
}

interface OpponentNote extends Phaser.GameObjects.Arc {
  keyType: string;
  isHold: boolean;
  spawnTime: number;
  originalY: number;
}

export class OpponentReplaySystem {
  private scene: Phaser.Scene;
  private viewArea: OpponentViewArea;
  public opponentNotes: OpponentNote[] = [];
  public opponentKeyVisuals: Record<string, Phaser.GameObjects.Image> = {};
  private opponentScore: number = 0;
  private opponentCombo: number = 0;
  private opponentNotePools: Record<string, any> = {};
  private scale: number = 0.4;
  public background?: Phaser.GameObjects.Rectangle;
  public titleText?: Phaser.GameObjects.Text;
  private judgmentY: number = 0;
  public judgmentLine?: Phaser.GameObjects.Graphics;
  private keyLanes: Record<string, KeyLane> = {};

  constructor(scene: Phaser.Scene, opponentViewArea: OpponentViewArea) {
    this.scene = scene;
    this.viewArea = opponentViewArea;
    
    // Initialize
    this.initialize();
  }
  
  private initialize(): void {
    const { x, y, width, height } = this.viewArea;
    
    // Create background for opponent view
    this.background = this.scene.add.rectangle(
      x + width / 2,
      y + height / 2,
      width,
      height,
      0x000000,
      0.8
    ).setDepth(90);
    
    // Title
    this.titleText = this.scene.add.text(
      x + width / 2,
      y + getResponsiveSpacing(10, height),
      "OPPONENT",
      {
        fontSize: getResponsiveFontSize(14, width, 12, 18),
        color: "#ff0000",
        fontStyle: "bold"
      }
    ).setOrigin(0.5, 0).setDepth(91);
    
    // Calculate scaled judgment line position
    const scaledJudgmentY = y + height - getResponsiveSpacing(30, height);
    this.judgmentY = scaledJudgmentY;
    
    // Create judgment line
    this.judgmentLine = this.scene.add.graphics();
    this.judgmentLine.lineStyle(2, 0xff0000, 1);
    this.judgmentLine.beginPath();
    this.judgmentLine.moveTo(x + getResponsiveSpacing(10, width), scaledJudgmentY);
    this.judgmentLine.lineTo(x + width - getResponsiveSpacing(10, width), scaledJudgmentY);
    this.judgmentLine.strokePath();
    this.judgmentLine.setDepth(91);
    
    // Create key lanes (scaled down)
    this.setupKeyLanes();
    
    // Create key visuals (smaller)
    this.setupKeyVisuals();
  }
  
  private setupKeyLanes(): void {
    const { x, width } = this.viewArea;
    const laneSpacing = width / 5;
    const startX = x + laneSpacing;
    
    this.keyLanes = {
      W: { x: startX, sprite: "key_w" },
      A: { x: startX + laneSpacing, sprite: "key_a" },
      S: { x: startX + laneSpacing * 2, sprite: "key_s" },
      D: { x: startX + laneSpacing * 3, sprite: "key_d" }
    };
  }
  
  private setupKeyVisuals(): void {
    const { x, y, width, height } = this.viewArea;
    const keySize = getResponsiveSpacing(20, width) * this.scale;
    const keyY = y + height - getResponsiveSpacing(20, height);
    
    for (const key in this.keyLanes) {
      const keyVisual = this.scene.add.image(
        this.keyLanes[key].x,
        keyY,
        this.keyLanes[key].sprite
      );
      keyVisual.setDisplaySize(keySize, keySize);
      keyVisual.setOrigin(0.5, 0.5);
      keyVisual.setAlpha(0.6); // Dimmed for opponent view
      this.opponentKeyVisuals[key] = keyVisual;
    }
  }
  
  /**
   * Handle opponent input event
   */
  handleOpponentInput(inputData: OpponentInputData): void {
    const { key, quality } = inputData;
    
    // Animate key press
    this.animateKeyPress(key, quality);
    
    // Show feedback (simplified)
    this.showFeedback(quality, key);
  }
  
  /**
   * Spawn note for opponent (when they receive a note)
   */
  spawnOpponentNote(noteData: OpponentNoteData): void {
    const key = noteData.key.toUpperCase();
    const lane = this.keyLanes[key];
    
    if (!lane) return;
    
    // Create note sprite (simplified, smaller)
    const noteSize = getResponsiveSpacing(15, this.viewArea.width) * this.scale;
    const note = this.scene.add.circle(
      lane.x,
      this.viewArea.y, // Start at top
      noteSize / 2,
      0xff0000, // Red for opponent
      0.7
    ) as OpponentNote;
    
    note.setDepth(92);
    note.keyType = key;
    note.isHold = noteData.isHold || false;
    note.spawnTime = noteData.time;
    note.originalY = this.viewArea.y;
    
    this.opponentNotes.push(note);
  }
  
  /**
   * Update opponent notes (move them down)
   */
  updateOpponentNotes(delta: number, pixelsPerSecond: number): void {
    const deltaSeconds = delta / 1000;
    const movementDelta = pixelsPerSecond * deltaSeconds;
    
    for (let i = this.opponentNotes.length - 1; i >= 0; i--) {
      const note = this.opponentNotes[i];
      
      // Move note down
      note.y += movementDelta;
      
      // Remove if past bottom
      if (note.y > this.viewArea.y + this.viewArea.height) {
        note.destroy();
        this.opponentNotes.splice(i, 1);
      }
    }
  }
  
  /**
   * Animate key press for opponent
   */
  private animateKeyPress(key: string, quality: string): void {
    const keyVisual = this.opponentKeyVisuals[key];
    if (!keyVisual) return;
    
    // Simple scale animation
    this.scene.tweens.add({
      targets: keyVisual,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 100,
      yoyo: true,
      ease: "Power2"
    });
    
    // Color based on quality
    let color = 0xff0000; // Default red
    if (quality === "perfect") color = 0x00ff00;
    else if (quality === "good") color = 0xffff00;
    
    keyVisual.setTint(color);
    this.scene.time.delayedCall(200, () => {
      keyVisual.clearTint();
    });
  }
  
  /**
   * Show feedback for opponent's hit
   */
  private showFeedback(quality: string, key: string): void {
    const lane = this.keyLanes[key];
    if (!lane) return;
    
    const feedbackText = this.scene.add.text(
      lane.x,
      this.judgmentY - getResponsiveSpacing(20, this.viewArea.height),
      quality.toUpperCase(),
      {
        fontSize: getResponsiveFontSize(12, this.viewArea.width, 10, 16),
        color: quality === "perfect" ? "#00ff00" : quality === "good" ? "#ffff00" : "#ff0000",
        fontStyle: "bold"
      }
    ).setOrigin(0.5, 0.5).setDepth(93);
    
    // Animate and remove
    this.scene.tweens.add({
      targets: feedbackText,
      y: feedbackText.y - getResponsiveSpacing(30, this.viewArea.height),
      alpha: 0,
      duration: 500,
      onComplete: () => feedbackText.destroy()
    });
  }
  
  /**
   * Update opponent score display
   */
  updateScore(score: number, combo: number): void {
    this.opponentScore = score;
    this.opponentCombo = combo;
    
    // Score is shown in main multiplayer UI, not here
    // This view is just for gameplay visualization
  }
  
  /**
   * Cleanup
   */
  destroy(): void {
    // Clean up all notes
    this.opponentNotes.forEach(note => note.destroy());
    this.opponentNotes = [];
    
    // Clean up visuals
    Object.values(this.opponentKeyVisuals).forEach(visual => visual.destroy());
    this.opponentKeyVisuals = {};
    
    // Clean up graphics
    if (this.judgmentLine) this.judgmentLine.destroy();
    if (this.background) this.background.destroy();
    if (this.titleText) this.titleText.destroy();
  }
}

