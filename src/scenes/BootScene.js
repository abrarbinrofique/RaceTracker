import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Nothing to load from disk — all placeholder assets are generated in create()
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.add.text(w / 2, h / 2, 'BEACH BUGGY RACING', {
      fontSize: '28px', fill: '#f5a623', fontFamily: 'monospace'
    }).setOrigin(0.5);
  }

  create() {
    // --- Buggy sprites (Phaser graphics → texture) ---
    this._makeBuggyTexture('buggy-p1', 0x3498db, 0xffd700);  // blue
    this._makeBuggyTexture('buggy-p2', 0xe74c3c, 0xffffff);  // red
    this._makeBuggyTexture('buggy-p3', 0x2ecc71, 0xffffff);  // green

    // --- Tileset ---
    this._makeTilesetTexture();

    // --- Weapon textures ---
    this._makeWeaponTextures();

    this.scene.start('MenuScene');
  }

  _makeBuggyTexture(key, bodyColor, trimColor) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // Body
    g.fillStyle(bodyColor);
    g.fillRect(4, 8, 24, 32);

    // Windshield
    g.fillStyle(0xaaddff, 0.8);
    g.fillRect(7, 10, 18, 12);

    // Wheels
    g.fillStyle(0x222222);
    g.fillRect(0, 10, 5, 10);
    g.fillRect(27, 10, 5, 10);
    g.fillRect(0, 28, 5, 10);
    g.fillRect(27, 28, 5, 10);

    // Front indicator (facing up when angle=0 in Phaser, but we rotate to -90 in-game)
    g.fillStyle(trimColor);
    g.fillRect(10, 5, 12, 4);

    g.generateTexture(key, 32, 48);
    g.destroy();
  }

  _makeTilesetTexture() {
    // 6 tiles: sand, sand-light, wall, mud/water, boost, jungle-floor
    const tileSize = 32;
    const tiles = [
      { color: 0xc8a96e },  // GID 1 — sand (track surface)
      { color: 0xe8d8ae },  // GID 2 — sand-light (off-track beach)
      { color: 0x3a5530 },  // GID 3 — wall/bush (dark green)
      { color: 0x8b6914 },  // GID 4 — mud (brownish)
      { color: 0xffe066 },  // GID 5 — boost pad
      { color: 0x1e3d10 },  // GID 6 — jungle floor (off-track jungle)
    ];

    const g = this.make.graphics({ x: 0, y: 0, add: false });

    tiles.forEach((tile, i) => {
      g.fillStyle(tile.color);
      g.fillRect(i * tileSize, 0, tileSize, tileSize);
      g.lineStyle(1, 0x000000, 0.1);
      g.strokeRect(i * tileSize, 0, tileSize, tileSize);
    });

    // Boost pad stripe pattern
    g.fillStyle(0xffaa00, 0.5);
    g.fillRect(4 * tileSize + 4, 4, tileSize - 8, 8);
    g.fillRect(4 * tileSize + 4, 20, tileSize - 8, 8);

    g.generateTexture('tiles-beach', tileSize * tiles.length, tileSize);
    g.destroy();
  }

  _makeWeaponTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // Weapon crate — glowing spinning box
    g.fillStyle(0xffd700);
    g.fillRect(2, 2, 28, 28);
    g.fillStyle(0xff8800);
    g.fillRect(6, 6, 20, 20);
    g.fillStyle(0xffffff, 0.6);
    g.fillRect(8, 8, 6, 6);
    g.generateTexture('weapon-crate', 32, 32);
    g.clear();

    // Coconut — brown rough circle
    g.fillStyle(0x6b3a2a);
    g.fillCircle(9, 9, 9);
    g.fillStyle(0x4a2518);
    g.fillCircle(7, 7, 4);
    g.generateTexture('proj-coconut', 18, 18);
    g.clear();

    // Oil slick — dark iridescent puddle
    g.fillStyle(0x1a0a2a, 0.85);
    g.fillEllipse(24, 12, 48, 24);
    g.fillStyle(0x440088, 0.3);
    g.fillEllipse(22, 10, 28, 14);
    g.generateTexture('proj-oilslick', 48, 24);
    g.clear();

    // Fireball — orange glow
    g.fillStyle(0xff4400);
    g.fillCircle(11, 11, 11);
    g.fillStyle(0xffaa00);
    g.fillCircle(11, 11, 7);
    g.fillStyle(0xffff88, 0.7);
    g.fillCircle(9, 9, 4);
    g.generateTexture('proj-fireball', 22, 22);
    g.clear();

    // Freeze ray — ice blue capsule
    g.fillStyle(0x88ddff);
    g.fillRoundedRect(0, 2, 28, 10, 5);
    g.fillStyle(0xeeffff, 0.6);
    g.fillRoundedRect(3, 4, 14, 6, 3);
    g.generateTexture('proj-freeze', 28, 14);
    g.clear();

    // Dodgeball — red rubber ball
    g.fillStyle(0xcc1111);
    g.fillCircle(8, 8, 8);
    g.fillStyle(0xff5555, 0.5);
    g.fillCircle(6, 6, 4);
    g.generateTexture('proj-dodgeball', 16, 16);
    g.clear();

    // Tiki Seeker — elongated missile with glow
    g.fillStyle(0xff6600);
    g.fillTriangle(12, 0, 0, 20, 24, 20);
    g.fillStyle(0xff3300);
    g.fillRect(8, 16, 8, 10);
    g.fillStyle(0xffff00, 0.7);
    g.fillCircle(12, 8, 4);
    g.generateTexture('proj-seeker', 24, 26);
    g.clear();

    // Explosion — burst circle for AOE
    g.fillStyle(0xff8800, 0.8);
    g.fillCircle(20, 20, 20);
    g.fillStyle(0xffff44, 0.6);
    g.fillCircle(20, 20, 13);
    g.generateTexture('fx-explosion', 40, 40);
    g.clear();

    // Ice shatter — blue burst
    g.fillStyle(0x88eeff, 0.8);
    g.fillCircle(16, 16, 16);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(16, 16, 9);
    g.generateTexture('fx-freeze', 32, 32);
    g.clear();

    g.destroy();
  }
}
