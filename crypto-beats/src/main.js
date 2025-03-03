import Phaser from "phaser";
import { Howl } from "howler";

let music;
let beatTimer = 0;

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
  this.load.audio("music", "/public/music.mp3"); // 🎵 Add your music file in /public
}

function create() {
  this.add.image(400, 300, "background");
  this.add.text(300, 100, "Crypto Beats", { fontSize: "32px", fill: "#fff" });

  // Load and Play Music
  music = new Howl({
    src: ["/public/music.mp3"],
    autoplay: true,
    loop: true,
    volume: 0.5,
    onplay: () => console.log("🎵 Music Started"),
  });

  // Sync beats every 500ms (Adjust this to match BPM)
  this.time.addEvent({
    delay: 500, // Adjust for the correct beat timing
    callback: onBeat,
    callbackScope: this,
    loop: true,
  });
}

function update(time, delta) {
  beatTimer += delta;
}

function onBeat() {
  console.log("🔥 Beat Drop!");
  // 🎵 Sync visual effects or mechanics here!
}

const game = new Phaser.Game(config);
