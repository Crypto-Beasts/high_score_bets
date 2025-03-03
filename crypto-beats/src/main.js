import Phaser from "phaser";

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
}

function create() {
  this.add.image(400, 300, "background");
  this.add.text(300, 100, "Crypto Beats", { fontSize: "32px", fill: "#fff" });
}

function update() {}

const game = new Phaser.Game(config);
