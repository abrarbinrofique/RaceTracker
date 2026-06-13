import Phaser from 'phaser';
import { BUGGIES } from '../data/buggies.js';
import ProgressManager from '../systems/ProgressManager.js';

const TRACK_NAMES = ['Crab Cove', 'Dino Jungle', 'Volcano Run'];

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const { width, height } = this.cameras.main;

    // Default config: P1 = Human, P2 = Robot, P3 = Robot
    this.slots = [
      { type: 'human', buggyIndex: 0 },
      { type: 'ai',    buggyIndex: 1 },
      { type: 'ai',    buggyIndex: 2 },
    ];
    this.selectedTrack = 0;
    this.difficulty = 1; // 0=Easy, 1=Medium, 2=Hard

    this._drawBg(width, height);
    this._drawTitle(width);
    this._drawTrackSelector(width);
    this._drawRacerSlots(width);
    this._drawDifficulty(width);
    this._drawStartButton(width, height);
    this._drawControlsHint(width, height);
  }

  _drawBg(w, h) {
    this.add.rectangle(w / 2, h / 2, w, h, 0x0a1f3c);
    // Ocean gradient strips
    for (let i = 0; i < 6; i++) {
      this.add.rectangle(w / 2, h - 40 + i * 18, w, 20, 0x1a5a8a, 0.15 + i * 0.08);
    }
    // Sun
    this.add.circle(w - 100, 90, 55, 0xffd700, 0.9);
  }

  _drawTitle(w) {
    this.add.text(w / 2, 52, 'BEACH BUGGY RACING', {
      fontSize: '46px', fill: '#ffd700', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#7a3a00', strokeThickness: 5
    }).setOrigin(0.5);
  }

  _drawTrackSelector(w) {
    this.add.text(w / 2, 118, 'TRACK', {
      fontSize: '16px', fill: '#88bbdd', fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.trackBtns = TRACK_NAMES.map((name, i) => {
      const x = w / 2 + (i - 1) * 210;
      const locked = !ProgressManager.isUnlocked(i);
      const lbl = locked ? `🔒 ${name}` : name;
      const btn = this.add.text(x, 150, lbl, {
        fontSize: '17px',
        fill: locked ? '#444' : (this.selectedTrack === i ? '#ffd700' : '#aaa'),
        fontFamily: 'monospace',
        backgroundColor: locked ? '#111' : '#112244',
        padding: { x: 12, y: 7 }
      }).setOrigin(0.5);

      if (!locked) {
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => !locked && btn.setStyle({ fill: '#ffffff' }));
        btn.on('pointerout', () => this._refreshUI());
        btn.on('pointerdown', () => { this.selectedTrack = i; this._refreshUI(); });
      }
      return btn;
    });
  }

  _drawRacerSlots(w) {
    this.add.text(w / 2, 200, 'RACERS', {
      fontSize: '16px', fill: '#88bbdd', fontFamily: 'monospace'
    }).setOrigin(0.5);

    const buggyColors = ['#3498db', '#e74c3c', '#2ecc71'];
    const buggyNames = BUGGIES.map(b => b.name.toUpperCase());

    this.slotUI = this.slots.map((slot, slotIdx) => {
      const y = 238 + slotIdx * 70;

      // Slot background
      const bg = this.add.rectangle(w / 2, y, 680, 56, 0x112244, 0.85).setOrigin(0.5);

      // Buggy color dot + slot label
      this.add.circle(w / 2 - 280, y, 10, Phaser.Display.Color.HexStringToColor(buggyColors[slotIdx]).color);
      const slotLabel = this.add.text(w / 2 - 255, y, `BUGGY ${slotIdx + 1}`, {
        fontSize: '16px', fill: buggyColors[slotIdx], fontFamily: 'monospace', fontStyle: 'bold'
      }).setOrigin(0, 0.5);

      // HUMAN button
      const humanBtn = this.add.text(w / 2 - 100, y, 'HUMAN', {
        fontSize: '17px', fill: slot.type === 'human' ? '#00ff88' : '#444',
        fontFamily: 'monospace', backgroundColor: '#0a1f3c',
        padding: { x: 10, y: 6 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      humanBtn.on('pointerover', () => humanBtn.setStyle({ fill: '#ffffff' }));
      humanBtn.on('pointerout', () => this._refreshUI());
      humanBtn.on('pointerdown', () => {
        // At least one human must remain
        const otherHumans = this.slots.filter((s, i) => i !== slotIdx && s.type === 'human');
        if (slot.type === 'ai' || otherHumans.length > 0) {
          this.slots[slotIdx].type = 'human';
          this._refreshUI();
        }
      });

      // ROBOT button
      const robotBtn = this.add.text(w / 2 + 40, y, 'ROBOT', {
        fontSize: '17px', fill: slot.type === 'ai' ? '#ff6b35' : '#444',
        fontFamily: 'monospace', backgroundColor: '#0a1f3c',
        padding: { x: 10, y: 6 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      robotBtn.on('pointerover', () => robotBtn.setStyle({ fill: '#ffffff' }));
      robotBtn.on('pointerout', () => this._refreshUI());
      robotBtn.on('pointerdown', () => {
        // Can't make ALL slots robot — keep at least one human
        const currentHumans = this.slots.filter(s => s.type === 'human');
        if (slot.type === 'human' && currentHumans.length <= 1) return;
        this.slots[slotIdx].type = 'ai';
        this._refreshUI();
      });

      // Buggy name label (right side)
      const nameLabel = this.add.text(w / 2 + 200, y, buggyNames[slot.buggyIndex], {
        fontSize: '14px', fill: '#666688', fontFamily: 'monospace'
      }).setOrigin(0.5);

      return { bg, slotLabel, humanBtn, robotBtn, nameLabel };
    });
  }

  _drawDifficulty(w) {
    this.add.text(w / 2, 462, 'AI DIFFICULTY', {
      fontSize: '16px', fill: '#88bbdd', fontFamily: 'monospace'
    }).setOrigin(0.5);

    const diffColors = { 0: '#44ff88', 1: '#ffd700', 2: '#ff4444' };
    this.diffBtns = DIFFICULTIES.map((name, i) => {
      const x = w / 2 + (i - 1) * 160;
      const btn = this.add.text(x, 494, name, {
        fontSize: '18px',
        fill: this.difficulty === i ? diffColors[i] : '#444',
        fontFamily: 'monospace',
        backgroundColor: '#0a1f3c',
        padding: { x: 14, y: 7 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => btn.setStyle({ fill: '#ffffff' }));
      btn.on('pointerout', () => this._refreshUI());
      btn.on('pointerdown', () => { this.difficulty = i; this._refreshUI(); });
      return btn;
    });
  }

  _drawStartButton(w, h) {
    const btn = this.add.text(w / 2, 575, '▶  START RACE', {
      fontSize: '34px', fill: '#00ff88', fontFamily: 'monospace', fontStyle: 'bold',
      backgroundColor: '#002211', padding: { x: 30, y: 14 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ fill: '#ffffff', backgroundColor: '#004422' }));
    btn.on('pointerout', () => btn.setStyle({ fill: '#00ff88', backgroundColor: '#002211' }));
    btn.on('pointerdown', () => this._startRace());
    this.input.keyboard.once('keydown-ENTER', () => this._startRace());
  }

  _drawControlsHint(w, h) {
    const humans = this.slots.filter(s => s.type === 'human');
    let hint = 'P1: Arrow keys + SPACE(fire) + Z(drift)';
    if (humans.length >= 2) hint += '   P2: WASD + ENTER(fire) + Q(drift)';
    if (humans.length >= 3) hint += '   P3: IJKL + M(fire) + N(drift)';

    this.controlsHint = this.add.text(w / 2, h - 22, hint, {
      fontSize: '12px', fill: '#555577', fontFamily: 'monospace'
    }).setOrigin(0.5);
  }

  _refreshUI() {
    const diffColors = { 0: '#44ff88', 1: '#ffd700', 2: '#ff4444' };

    // Track buttons
    if (this.trackBtns) {
      this.trackBtns.forEach((btn, i) => {
        if (ProgressManager.isUnlocked(i)) {
          btn.setStyle({ fill: this.selectedTrack === i ? '#ffd700' : '#aaa' });
        }
      });
    }

    // Slot buttons
    if (this.slotUI) {
      this.slotUI.forEach((ui, slotIdx) => {
        const slot = this.slots[slotIdx];
        ui.humanBtn.setStyle({ fill: slot.type === 'human' ? '#00ff88' : '#444' });
        ui.robotBtn.setStyle({ fill: slot.type === 'ai' ? '#ff6b35' : '#444' });
      });
    }

    // Difficulty buttons
    if (this.diffBtns) {
      this.diffBtns.forEach((btn, i) => {
        btn.setStyle({ fill: this.difficulty === i ? diffColors[i] : '#444' });
      });
    }

    // Controls hint
    if (this.controlsHint) {
      const humans = this.slots.filter(s => s.type === 'human');
      let hint = 'P1: Arrow keys + SPACE(fire) + Z(drift)';
      if (humans.length >= 2) hint += '   P2: WASD + ENTER(fire) + Q(drift)';
      if (humans.length >= 3) hint += '   P3: IJKL + M(fire) + N(drift)';
      this.controlsHint.setText(hint);
    }
  }

  _startRace() {
    this.scene.start('RaceScene', {
      playerConfigs: this.slots.map((s, i) => ({ ...s })),
      trackIndex: this.selectedTrack,
      difficulty: DIFFICULTIES[this.difficulty].toLowerCase()
    });
  }
}
