/**
 * Opponent Replay System
 * Simulates opponent's gameplay on a mini view
 */

import { getResponsiveSpacing, getResponsiveFontSize } from "../../utils/ui/responsive.js";

export class OpponentReplaySystem {
  constructor(scene, opponentViewArea) {
    this.scene = scene;
    this.viewArea = opponentViewArea; // {x, y, width, height}
    
    // Opponent's game state
    this.opponentNotes = []; // Notes currently falling
    this.opponentKeyVisuals = {}; // Key press visuals
    this.opponentScore = 0;
    this.opponentCombo = 0;
    
    // Note pools for opponent (reuse from main game)
    this.opponentNotePools = {};
    
    // Scale factor for mini view
    this.scale = 0.4; // 40% size
    
    // Initialize
    this.initialize();
  }
  
  initialize() {
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
        fill: "#ff0000",
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
  
  setupKeyLanes() {
    const { x, y, width, height } = this.viewArea;
    const laneSpacing = width / 5;
    const startX = x + laneSpacing;
    
    this.keyLanes = {
      W: { x: startX, sprite: "key_w" },
      A: { x: startX + laneSpacing, sprite: "key_a" },
      S: { x: startX + laneSpacing * 2, sprite: "key_s" },
      D: { x: startX + laneSpacing * 3, sprite: "key_d" }
    };
  }
  
  setupKeyVisuals() {
    const { x, y, width, height } = this.viewArea;
    const keySize = getResponsiveSpacing(20, width) * this.scale;
    const keyY = y + height - getResponsiveSpacing(20, height);
    
    for (let key in this.keyLanes) {
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
   * @param {Object} inputData - {key, timestamp, noteTime, quality}
   */
  handleOpponentInput(inputData) {
    const { key, quality } = inputData;
    
    // Animate key press
    this.animateKeyPress(key, quality);
    
    // Show feedback (simplified)
    this.showFeedback(quality, key);
  }
  
  /**
   * Spawn note for opponent (when they receive a note)
   * @param {Object} noteData - {key, time, isHold, duration}
   */
  spawnOpponentNote(noteData) {
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
    );
    
    note.setDepth(92);
    note.keyType = key;
    note.isHold = noteData.isHold || false;
    note.spawnTime = noteData.time;
    note.originalY = this.viewArea.y;
    
    this.opponentNotes.push(note);
  }
  
  /**
   * Update opponent notes (move them down)
   * @param {number} delta - Time delta in ms
   * @param {number} pixelsPerSecond - Note speed
   */
  updateOpponentNotes(delta, pixelsPerSecond) {
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
  animateKeyPress(key, quality) {
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
  showFeedback(quality, key) {
    const lane = this.keyLanes[key];
    if (!lane) return;
    
    const feedbackText = this.scene.add.text(
      lane.x,
      this.judgmentY - getResponsiveSpacing(20, this.viewArea.height),
      quality.toUpperCase(),
      {
        fontSize: getResponsiveFontSize(12, this.viewArea.width, 10, 16),
        fill: quality === "perfect" ? "#00ff00" : quality === "good" ? "#ffff00" : "#ff0000",
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
  updateScore(score, combo) {
    this.opponentScore = score;
    this.opponentCombo = combo;
    
    // Score is shown in main multiplayer UI, not here
    // This view is just for gameplay visualization
  }
  
  /**
   * Cleanup
   */
  destroy() {
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

