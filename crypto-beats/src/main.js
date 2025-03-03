import Phaser from "phaser";
import { Howl } from "howler";

let music;
let fallingKeys = [];
let score = 0;
let scoreText;
let keyLanes = {
  W: 200,
  A: 350,
  S: 500,
  D: 650,
};
let keyColors = {
  W: "key_w",
  A: "key_a",
  S: "key_s",
  D: "key_d",
};

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scene: {
    preload,
    create,
    update,
  },
};

function preload() {
  this.load.image("background", "/public/background.png");
  this.load.image("key_w", "/public/key_w.png");
  this.load.image("key_a", "/public/key_a.png");
  this.load.image("key_s", "/public/key_s.png");
  this.load.image("key_d", "/public/key_d.png");
  this.load.audio("music", "/public/music.mp3");
}

function create() {
  this.add.image(400, 300, "background");
  scoreText = this.add.text(20, 20, "Score: 0", { fontSize: "24px", fill: "#fff" });

  // Load and play music
  music = new Howl({
    src: ["/public/music.mp3"],
    autoplay: true,
    loop: true,
    volume: 0.5,
  });

  // Drop a key every beat
  this.time.addEvent({
    delay: 1000, // Adjust for BPM
    callback: dropKey,
    callbackScope: this,
    loop: true,
  });

  // Listen for W, A, S, D inputs
  this.input.keyboard.on("keydown", handlePlayerInput, this);
}

function update(time, delta) {
  for (let i = 0; i < fallingKeys.length; i++) {
    fallingKeys[i].y += 2;
    if (fallingKeys[i].y > 600) {
      fallingKeys[i].destroy();
      fallingKeys.splice(i, 1);
      i--;
    }
  }
}

// Drop random keys
function dropKey() {
  const keyList = ["W", "A", "S", "D"];
  const randomKey = keyList[Phaser.Math.Between(0, keyList.length - 1)];
  const xPosition = keyLanes[randomKey];
  const keySprite = keyColors[randomKey];

  const key = this.add.image(xPosition, 0, keySprite);
  key.keyType = randomKey;
  fallingKeys.push(key);
}

// Handle Player Input
function handlePlayerInput(event) {
  const keyPressed = event.key.toUpperCase();
  if (keyLanes[keyPressed]) {
    for (let i = 0; i < fallingKeys.length; i++) {
      if (fallingKeys[i].keyType === keyPressed && fallingKeys[i].y > 500 && fallingKeys[i].y < 550) {
        console.log(`Perfect hit! ${keyPressed}`);
        fallingKeys[i].destroy();
        fallingKeys.splice(i, 1);
        score += 10;
        scoreText.setText("Score: " + score);
        break;
      }
    }
  }
}

const game = new Phaser.Game(config);
