import './style.css';
import Phaser from 'phaser';

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    }
};

const game = new Phaser.Game(config);

let balloons = [];
let pump;
let isPumping = false;
let alphabetImages = [];
let balloonImages = [];
const maxBalloonSize = 0.4;
let pumpHandle; // Define the pump handle globally

function preload() {
    this.load.image('pump', 'Graphic/pump.png');
    this.load.image('background', 'Graphic/background.png');
    this.load.image('pumpHandle', 'Graphic/pump_handle.png'); // Load the pump handle

    const colors = ['blue', 'red', 'green', 'yellow'];
    balloonImages = colors.map(color => `balloon_${color}`);
    balloonImages.forEach(color => this.load.image(color, `Graphic/${color}.png`));

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    alphabetImages = letters.split('').map(letter => `Letter_${letter}`);
    alphabetImages.forEach(letter => this.load.image(letter, `public/Graphic/${letter}.png`));

    this.load.image('string', 'Graphic/string.png');

    // Dynamically create a circle texture for the particles
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffffff, 1);  // Set color to white or any color you like
    graphics.fillCircle(5, 5, 5);     // Draw a small circle of radius 5
    graphics.generateTexture('circleParticle', 10, 10);  // Generate texture from the circle graphic

}

function create() {
    const background = this.add.image(0, 0, 'background');
    background.setOrigin(0, 0);
    background.setDisplaySize(this.cameras.main.width, this.cameras.main.height);

    this.scale.on('resize', function (gameSize) {
        background.setDisplaySize(gameSize.width, gameSize.height);
    });

    pump = this.add.image(0, 0, 'pump').setOrigin(1, 1).setScale(0.4);
    pump.setPosition(this.cameras.main.width - 20, this.cameras.main.height - 20);
    pump.setInteractive();

    // Initialize the pump handle positioned on top of the pump
    // pumpHandle = this.add.image(pump.x, pump.y - pump.height * pump.scaleY, 'pumpHandle')
    //     .setOrigin(1, 1)
    //     .setScale(0.4);

    pump.on('pointerdown', startInflating, this);
    pump.on('pointerup', stopInflating, this);
    pump.on('pointerout', stopInflating, this);
    // pump.on('pointerdown', startPumping, this);
    // pump.on('pointerup', stopPumping, this);
    // pump.on('pointerout', stopPumping, this);

    createNewBalloon(this);  // Pass the scene context

    // Create the particle manager once
    this.particleManager = this.add.particles('circleParticle');
}

function createNewBalloon(scene) {
    const randomBalloonKey = Phaser.Utils.Array.GetRandom(balloonImages);
    const randomLetterKey = Phaser.Utils.Array.GetRandom(alphabetImages);

    const snoutOffsetX = -pump.width * pump.scaleX * 0.76;
    const snoutOffsetY = -pump.height * pump.scaleY * 0.53;
    const balloon = scene.add.image(pump.x + snoutOffsetX, pump.y + snoutOffsetY, randomBalloonKey).setOrigin(0.5, 0.5);
    balloon.setScale(0.07);

    const letterImage = scene.add.image(balloon.x, balloon.y, randomLetterKey).setOrigin(0.5, 0.5);
    letterImage.setScale(0.03);
    balloon.letterImage = letterImage;

    balloon.isFloating = false;
    balloon.velocityX = Phaser.Math.Between(-1, 1);
    balloon.velocityY = Phaser.Math.Between(-1, -2);
    balloon.string = null;

    balloon.setInteractive();
    balloon.on('pointerdown', () => burstBalloon(balloon, scene));

    balloons.push(balloon);
}

function update() {
    if (isPumping && balloons.length > 0) {
        inflateBalloon(balloons[balloons.length - 1], this);
    }

    balloons.forEach(balloon => {
        if (balloon.isFloating) {
            floatBalloon(balloon);
        }
    });
}

function inflateBalloon(balloon, scene) {
    if (balloon.scaleX < maxBalloonSize) {
        balloon.setScale(balloon.scaleX + 0.007);
        balloon.y -= 2;

        balloon.letterImage.setScale(0.5 * balloon.scaleX);
        balloon.letterImage.setPosition(balloon.x, balloon.y);

        if (balloon.scaleX >= maxBalloonSize && !balloon.string) {
            console.log("Adding string and enabling float for balloon");
            addString(balloon, scene);
            balloon.isFloating = true;
            createNewBalloon(scene);
        }
    }
}

function startInflating() {
    isPumping = true;
}

function stopInflating() {
    isPumping = false;
}

function addString(balloon, scene) {
    const stringOffsetY = balloon.displayHeight * -0.1;
    balloon.string = scene.add.image(balloon.x, balloon.y + stringOffsetY, 'string');
    balloon.string.setOrigin(0.5, 0);
    balloon.string.setScale(0.7);
}

function floatBalloon(balloon) {
    balloon.velocityX += Phaser.Math.FloatBetween(-0.05, 0.05);
    balloon.velocityY += Phaser.Math.FloatBetween(-0.05, 0.05);
    balloon.x += balloon.velocityX;
    balloon.y += balloon.velocityY;

    const leftBound = balloon.displayWidth / 2;
    const rightBound = game.config.width - balloon.displayWidth / 2;
    const upperBound = balloon.displayHeight / 2;
    const lowerBound = game.config.height - balloon.displayHeight / 2;

    if (balloon.x <= leftBound || balloon.x >= rightBound) {
        balloon.velocityX *= -1;
    }

    if (balloon.y <= upperBound || balloon.y >= lowerBound) {
        balloon.velocityY *= -1;
    }

    balloon.letterImage.setPosition(balloon.x, balloon.y);
    if (balloon.string) {
        balloon.string.setPosition(balloon.x, balloon.y + balloon.displayHeight * -0.1);
    }
}

function burstBalloon(balloon) {
    
    balloon.setVisible(false); // Hide the balloon

    // Remove the balloon from the list and destroy associated assets
    Phaser.Utils.Array.Remove(balloons, balloon); // Remove from array
    if (balloon.letterImage) {
        balloon.letterImage.destroy(); // Remove the letter image
    }
    if (balloon.string) {
        balloon.string.destroy(); // Remove the string
    }
    balloon.destroy(); // Destroy the balloon
}










