import Phaser from 'phaser';
import { WEAPONS } from '../data/weapons.js';

const TIER_COLOR = { common: '#ffdd44', rare: '#44aaff', epic: '#ff44ff' };

export default class HUD {
  constructor(scene, players, totalLaps) {
    this.scene = scene;
    this.players = players;
    this.totalLaps = totalLaps;

    // All HUD elements are fixed to camera (setScrollFactor(0))
    this._elements = [];
    this._create();
  }

  _create() {
    const s = this.scene;
    const { width, height } = s.cameras.main;

    // --- Top bar background ---
    const topBar = s.add.rectangle(width / 2, 24, width, 48, 0x000000, 0.55).setScrollFactor(0).setDepth(100);
    this._elements.push(topBar);

    // Lap counter (top center)
    this.lapText = s.add.text(width / 2, 16, 'LAP 1 / 3', {
      fontSize: '22px', fill: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(101);

    // Timer (top right)
    this.timerText = s.add.text(width - 16, 16, '00:00.000', {
      fontSize: '18px', fill: '#aaffaa', fontFamily: 'monospace'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(101);

    // Position (top left)
    this.posText = s.add.text(16, 16, '1st', {
      fontSize: '22px', fill: '#ffd700', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0, 0).setScrollFactor(0).setDepth(101);

    // Weapon slot (bottom center)
    this.weaponBg = s.add.rectangle(width / 2, height - 40, 160, 50, 0x000000, 0.6)
      .setScrollFactor(0).setDepth(100);
    this.weaponText = s.add.text(width / 2, height - 40, '[ no weapon ]', {
      fontSize: '16px', fill: '#aaaaaa', fontFamily: 'monospace'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    // Speed bar (bottom left)
    this.speedBarBg = s.add.rectangle(80, height - 36, 120, 14, 0x333333, 0.8)
      .setScrollFactor(0).setDepth(100);
    this.speedBar = s.add.rectangle(22, height - 36, 0, 12, 0x00ff88, 1)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);
    this.speedLabel = s.add.text(16, height - 52, 'SPEED', {
      fontSize: '11px', fill: '#888888', fontFamily: 'monospace'
    }).setScrollFactor(0).setDepth(101);

    // Controls reminder (bottom right, small)
    s.add.text(width - 16, height - 16, 'SPACE/ENTER: fire   Z/Q: drift', {
      fontSize: '11px', fill: '#555555', fontFamily: 'monospace'
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(101);
  }

  update(buggy, elapsedMs) {
    // Lap
    const lap = Math.min(buggy.lap + 1, this.totalLaps);
    this.lapText.setText(`LAP ${lap} / ${this.totalLaps}`);

    // Position suffix
    const pos = buggy.racePosition;
    const suffix = pos === 1 ? 'st' : pos === 2 ? 'nd' : pos === 3 ? 'rd' : 'th';
    this.posText.setText(`${pos}${suffix}`);

    // Timer
    this.timerText.setText(this._formatTime(elapsedMs));

    // Weapon slot — label + tier color
    if (buggy.currentWeapon) {
      const wDef  = WEAPONS[buggy.currentWeapon];
      const label = wDef ? wDef.label : buggy.currentWeapon;
      const color = wDef ? (TIER_COLOR[wDef.tier] || '#ffdd44') : '#ffdd44';
      this.weaponText.setText(`[ ${label} ]`);
      this.weaponText.setStyle({ fill: color });
    } else {
      this.weaponText.setText('[ no weapon ]');
      this.weaponText.setStyle({ fill: '#444444' });
    }

    // Speed bar (0–120px wide)
    const speedRatio = Math.abs(buggy.speed) / buggy.stats.maxSpeed;
    this.speedBar.width = speedRatio * 120;
    const barColor = buggy.speed < 0 ? 0xff4444 : 0x00ff88;
    this.speedBar.setFillStyle(barColor);
  }

  showCountdown(number) {
    const { width, height } = this.scene.cameras.main;
    const label = number <= 0 ? 'GO!' : `${number}`;
    const color = number <= 0 ? '#00ff88' : '#ffd700';
    const txt = this.scene.add.text(width / 2, height / 2, label, {
      fontSize: '96px', fill: color, fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 8
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

    this.scene.tweens.add({
      targets: txt,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 800,
      onComplete: () => txt.destroy()
    });
  }

  _formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  }
}
