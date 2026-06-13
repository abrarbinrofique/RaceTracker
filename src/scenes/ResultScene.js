import Phaser from 'phaser';
import { TRACKS } from '../data/tracks.js';
import ProgressManager from '../systems/ProgressManager.js';

export default class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' });
  }

  init(data) {
    this.finishOrder   = data.finishOrder || [];
    this.trackName     = data.trackName || 'Race';
    this.trackIndex    = data.trackIndex ?? 0;
    this.playerConfigs = data.playerConfigs || [];
    this.difficulty    = data.difficulty || 'medium';
    this.nextUnlocked  = data.nextUnlocked || false;
    this.newRecord     = data.newRecord || false;
    this.hasNextTrack  = data.hasNextTrack || false;
  }

  create() {
    const { width, height } = this.cameras.main;

    this.add.rectangle(width/2, height/2, width, height, 0x08141f);

    // Title
    this.add.text(width/2, 52, 'RACE COMPLETE', {
      fontSize:'48px', fill:'#ffd700', fontFamily:'monospace', fontStyle:'bold',
      stroke:'#7a3a00', strokeThickness:5
    }).setOrigin(0.5);

    // Track name + new record badge
    let trackLine = this.trackName;
    if (this.newRecord) trackLine += '  ⭐ NEW BEST!';
    this.add.text(width/2, 118, trackLine, {
      fontSize:'20px', fill: this.newRecord ? '#ffd700' : '#88bbdd', fontFamily:'monospace'
    }).setOrigin(0.5);

    // Finisher rows
    this._drawPodium(width);

    // Outcome message
    const humanWon = this.finishOrder[0]?.isHuman;
    const humanFinished = this.finishOrder.some(r => r.isHuman);
    const msg  = humanWon ? '🏆 YOU WIN!' : humanFinished ? '💪 Keep trying!' : '🤖 Robots dominate!';
    const col  = humanWon ? '#ffd700' : humanFinished ? '#aaffaa' : '#ff6b35';
    this.add.text(width/2, 498, msg, {
      fontSize:'28px', fill:col, fontFamily:'monospace', fontStyle:'bold'
    }).setOrigin(0.5);

    // UNLOCK BANNER
    if (this.nextUnlocked && this.hasNextTrack) {
      const nextName = TRACKS[this.trackIndex + 1]?.name || 'Next Track';
      const banner = this.add.text(width/2, 545, `🔓 UNLOCKED: ${nextName.toUpperCase()}!`, {
        fontSize:'22px', fill:'#00ff88', fontFamily:'monospace', fontStyle:'bold',
        stroke:'#000', strokeThickness:4
      }).setOrigin(0.5);
      this.tweens.add({
        targets: banner, scaleX: 1.05, scaleY: 1.05,
        yoyo: true, repeat: -1, duration: 600, ease: 'Sine.easeInOut'
      });
    }

    // Buttons
    this._drawButtons(width, height);

    this.add.text(width/2, height-18, 'ENTER = Rematch   N = Next Level   ESC = Menu', {
      fontSize:'12px', fill:'#445566', fontFamily:'monospace'
    }).setOrigin(0.5);

    // Keyboard shortcuts
    this.input.keyboard.once('keydown-ESC', () => this.scene.start('MenuScene'));
    this.input.keyboard.once('keydown-ENTER', () => this._rematch());
    if (this.hasNextTrack && ProgressManager.isUnlocked(this.trackIndex + 1)) {
      this.input.keyboard.once('keydown-N', () => this._goNextLevel());
    }
  }

  _drawPodium(width) {
    const placeColors = ['#ffd700', '#cccccc', '#cd7f32', '#aaaaaa'];
    const placeLabels = ['1ST', '2ND', '3RD', '4TH'];

    this.finishOrder.forEach((result, i) => {
      const y = 196 + i * 68;
      const rowBg = result.isHuman ? 0x112244 : 0x150a0a;
      this.add.rectangle(width/2, y, 720, 56, rowBg, 0.88).setOrigin(0.5);

      this.add.text(width/2 - 320, y, placeLabels[i] || `${i+1}TH`, {
        fontSize:'20px', fill:placeColors[i]||'#aaa', fontFamily:'monospace', fontStyle:'bold'
      }).setOrigin(0, 0.5);

      const badge = result.isHuman ? '🧑' : '🤖';
      this.add.text(width/2 - 240, y, badge, { fontSize:'22px' }).setOrigin(0, 0.5);

      this.add.text(width/2 - 200, y, result.name, {
        fontSize:'20px', fill: result.isHuman ? '#aaddff' : '#ff8855', fontFamily:'monospace'
      }).setOrigin(0, 0.5);

      this.add.text(width/2 + 240, y, this._fmt(result.time), {
        fontSize:'18px', fill:'#aaffaa', fontFamily:'monospace'
      }).setOrigin(1, 0.5);

      // Best time comparison
      const best = ProgressManager.getBestTime(this.trackIndex);
      if (result.isHuman && best) {
        const diff = result.time - best;
        const sign = diff <= 0 ? '-' : '+';
        const diffStr = sign + this._fmt(Math.abs(diff));
        this.add.text(width/2 + 260, y, diffStr, {
          fontSize:'13px', fill: diff <= 0 ? '#00ff88' : '#ff6666', fontFamily:'monospace'
        }).setOrigin(0, 0.5);
      }
    });
  }

  _drawButtons(width, height) {
    const nextAvailable = this.hasNextTrack && ProgressManager.isUnlocked(this.trackIndex + 1);
    const btnY = 574;

    // NEXT LEVEL button (highlighted if just unlocked or already available)
    if (nextAvailable) {
      const nextColor = this.nextUnlocked ? '#00ff88' : '#aaddff';
      const nextBg    = this.nextUnlocked ? '#003322' : '#001a33';
      const nextBtn = this.add.text(width/2 + 10, btnY, '▶▶  NEXT LEVEL', {
        fontSize:'26px', fill:nextColor, fontFamily:'monospace', fontStyle:'bold',
        backgroundColor:nextBg, padding:{ x:18, y:11 }
      }).setOrigin(0, 0.5).setInteractive({ useHandCursor:true });

      if (this.nextUnlocked) {
        // Pulse animation on the newly unlocked button
        this.tweens.add({
          targets:nextBtn, alpha:0.6, yoyo:true, repeat:-1, duration:500
        });
      }
      nextBtn.on('pointerover', () => nextBtn.setStyle({ fill:'#ffffff' }));
      nextBtn.on('pointerout',  () => nextBtn.setStyle({ fill:nextColor  }));
      nextBtn.on('pointerdown', () => this._goNextLevel());
    }

    const rematchX = nextAvailable ? width/2 - 180 : width/2 - 110;

    const rematchBtn = this.add.text(rematchX, btnY, '↺ REMATCH', {
      fontSize:'24px', fill:'#aaffaa', fontFamily:'monospace',
      backgroundColor:'#0a2a0a', padding:{ x:14, y:11 }
    }).setOrigin(nextAvailable ? 1 : 0.5, 0.5).setInteractive({ useHandCursor:true });
    rematchBtn.on('pointerover', ()=>rematchBtn.setStyle({fill:'#ffffff'}));
    rematchBtn.on('pointerout',  ()=>rematchBtn.setStyle({fill:'#aaffaa'}));
    rematchBtn.on('pointerdown', ()=>this._rematch());

    const menuBtn = this.add.text(
      nextAvailable ? width/2 - 190 : width/2 + 120,
      nextAvailable ? btnY + 52 : btnY,
      '⌂ MENU',
      { fontSize:'20px', fill:'#6688aa', fontFamily:'monospace',
        backgroundColor:'#0a1522', padding:{ x:14, y:9 } }
    ).setOrigin(nextAvailable ? 0 : 0.5, 0.5).setInteractive({ useHandCursor:true });
    menuBtn.on('pointerover', ()=>menuBtn.setStyle({fill:'#ffffff'}));
    menuBtn.on('pointerout',  ()=>menuBtn.setStyle({fill:'#6688aa'}));
    menuBtn.on('pointerdown', ()=>this.scene.start('MenuScene'));
  }

  _rematch() {
    this.scene.start('RaceScene', {
      playerConfigs: this.playerConfigs,
      trackIndex:    this.trackIndex,
      difficulty:    this.difficulty
    });
  }

  _goNextLevel() {
    const next = this.trackIndex + 1;
    if (next >= TRACKS.length || !ProgressManager.isUnlocked(next)) return;
    this.scene.start('RaceScene', {
      playerConfigs: this.playerConfigs,
      trackIndex:    next,
      difficulty:    this.difficulty
    });
  }

  _fmt(ms) {
    const m   = Math.floor(ms / 60000);
    const s   = Math.floor((ms % 60000) / 1000);
    const mil = ms % 1000;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(mil).padStart(3,'0')}`;
  }
}
