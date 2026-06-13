import Phaser from 'phaser';
import Buggy from '../entities/Buggy.js';
import AIBuggy from '../entities/AIBuggy.js';
import RaceManager, { RaceState } from '../systems/RaceManager.js';
import ProgressManager from '../systems/ProgressManager.js';
import WeaponSystem from '../systems/WeaponSystem.js';
import HUD from '../ui/HUD.js';
import { TRACKS } from '../data/tracks.js';
import { BUGGIES } from '../data/buggies.js';

const TILE = 32;
const MAP_W = 100;
const MAP_H = 32;

// GID constants (1-indexed, matching tileset columns)
const T = {
  SAND:        1,  // track surface
  SAND_LIGHT:  2,  // off-track (beach)
  WALL:        3,  // solid collision
  MUD:         4,  // slow terrain (no collision)
  BOOST:       5,  // speed pad
  JUNGLE:      6,  // off-track (jungle)
};

const BUGGY_TEXTURES = ['buggy-p1', 'buggy-p2', 'buggy-p3'];

export default class RaceScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RaceScene' });
  }

  init(data) {
    this.playerConfigs = data.playerConfigs || [{ type: 'human', buggyIndex: 0 }];
    this.trackIndex    = data.trackIndex || 0;
    this.trackData     = TRACKS[this.trackIndex];
    this.difficulty    = data.difficulty || 'medium';
    this._raceResultSent = false;
  }

  create() {
    const worldW = MAP_W * TILE;
    const worldH = MAP_H * TILE;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBackgroundColor(this.trackData.bgColor || 0x87ceeb);

    this.groundLayer = this._buildTrack();

    this.humanBuggies = [];
    this.aiBuggies    = [];
    this.allBuggies   = [];
    this._spawnBuggies();

    // Collisions
    this.allBuggies.forEach(b => this.physics.add.collider(b, this.groundLayer));
    for (let i = 0; i < this.allBuggies.length; i++) {
      for (let j = i + 1; j < this.allBuggies.length; j++) {
        this.physics.add.collider(this.allBuggies[i], this.allBuggies[j]);
      }
    }

    // Input key sets — one per human slot order
    // Fire = SPACE (P1), ENTER (P2), M (P3) — avoid CTRL/ALT which browsers intercept on Linux
    const KEY_SETS = [
      { up:'UP', down:'DOWN', left:'LEFT', right:'RIGHT',
        fire: Phaser.Input.Keyboard.KeyCodes.SPACE,
        drift: Phaser.Input.Keyboard.KeyCodes.Z },
      { up:'W', down:'S', left:'A', right:'D',
        fire: Phaser.Input.Keyboard.KeyCodes.ENTER,
        drift: Phaser.Input.Keyboard.KeyCodes.Q },
      { up:'I', down:'K', left:'J', right:'L',
        fire: Phaser.Input.Keyboard.KeyCodes.M,
        drift: Phaser.Input.Keyboard.KeyCodes.N },
    ];
    this.humanKeys = this.humanBuggies.map((_, idx) =>
      this.input.keyboard.addKeys(KEY_SETS[idx])
    );

    this._setupCamera(worldW, worldH);

    this.raceManager = new RaceManager(
      this, this.allBuggies, this.trackData.waypoints, this.trackData.laps
    );
    this.raceManager.createWaypointZones();

    this.hud = new HUD(this, this.humanBuggies.length, this.trackData.laps);

    // --- Weapon System ---
    this.weaponSystem = new WeaponSystem(this, this.allBuggies, this.groundLayer);
    this.weaponSystem.spawnCrates(this.trackData.crateSpawns);

    // Fire uses Phaser.Input.Keyboard.JustDown — frame-accurate, no race condition

    // Events
    this.events.on('lapComplete', (buggy) => {
      if (this.humanBuggies.includes(buggy)) this._showFlash('LAP!', '#00ff88');
    });

    this.events.on('buggyFinished', (buggy, place) => {
      const s = ['st','nd','rd'][place-1] || 'th';
      const isHuman = this.humanBuggies.includes(buggy);
      this._showFlash(
        isHuman ? `YOU FINISHED ${place}${s}!` : `ROBOT ${place}${s}`,
        isHuman ? (place === 1 ? '#ffd700' : '#ffffff') : '#ff6b35'
      );
    });

    this.events.on('raceFinished', (finishOrder) => {
      if (this._raceResultSent) return;
      this._raceResultSent = true;
      this._onRaceFinished(finishOrder);
    });

    // Countdown
    this._countdownActive = true;
    [3, 2, 1].forEach((n, i) => this.time.delayedCall(i * 900, () => this.hud.showCountdown(n)));
    this.time.delayedCall(2700, () => {
      this.hud.showCountdown(0);
      this._countdownActive = false;
      this.raceManager.startRace();
    });

    // Debug overlay
    this._debugContainer = this._drawWaypointDebug();
    this._debugContainer.setVisible(false);
    this.input.keyboard.on('keydown-F1', () =>
      this._debugContainer.setVisible(!this._debugContainer.visible)
    );
    this.input.keyboard.once('keydown-ESC', () => this.scene.start('MenuScene'));
  }

  // ─── Track Building ──────────────────────────────────────────────────────

  _buildTrack() {
    const offTile = this.trackData.theme === 'jungle' ? T.JUNGLE : T.SAND_LIGHT;
    const mapData = Array.from({ length: MAP_H }, () => new Array(MAP_W).fill(offTile));

    if (this.trackData.theme === 'jungle') {
      this._paintFigure8(mapData);
    } else {
      this._paintOval(mapData);
    }

    this._paintWallBorders(mapData);

    const map = this.make.tilemap({ data: mapData, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage('tiles-beach', 'tiles-beach', TILE, TILE, 0, 0);
    const layer = map.createLayer(0, tileset, 0, 0);
    layer.setCollision([T.WALL]);

    this._drawStartLine();
    return layer;
  }

  // Crab Cove — rectangular stadium circuit with four corridors
  _paintOval(mapData) {
    const fill = (r1, r2, c1, c2) => {
      for (let r = r1; r <= r2; r++)
        for (let c = c1; c <= c2; c++)
          mapData[r][c] = T.SAND;
    };
    fill(3, 9,  3, 97);   // top straight
    fill(23, 29, 3, 97);  // bottom straight
    fill(3, 29,  3, 11);  // left vertical
    fill(3, 29, 89, 97);  // right vertical

    // Boost pads mid-straight
    [[6,22],[6,78],[26,22],[26,78]].forEach(([r,c]) => {
      if (mapData[r]?.[c] === T.SAND) mapData[r][c] = T.BOOST;
    });
  }

  // Dino Jungle — larger figure-8 (two overlapping ovals)
  _paintFigure8(mapData) {
    const lCX = 28, lCY = 16, lOR = 25, lOY = 11, lIR = 14, lIY = 5;
    const rCX = 72, rCY = 16, rOR = 25, rOY = 11, rIR = 14, rIY = 5;

    for (let row = 0; row < MAP_H; row++) {
      for (let col = 0; col < MAP_W; col++) {
        const lO = ((col-lCX)/lOR)**2 + ((row-lCY)/lOY)**2;
        const lI = ((col-lCX)/lIR)**2 + ((row-lCY)/lIY)**2;
        const rO = ((col-rCX)/rOR)**2 + ((row-rCY)/rOY)**2;
        const rI = ((col-rCX)/rIR)**2 + ((row-rCY)/rIY)**2;

        const inLeft  = lO <= 1 && lI >= 1;
        const inRight = rO <= 1 && rI >= 1;
        if (inLeft || inRight) mapData[row][col] = T.SAND;
      }
    }

    // Mud patches on top/bottom of each loop
    const mudSpots = [
      [7,24],[7,25],[7,26],[7,27],[7,28],
      [25,24],[25,25],[25,26],[25,27],[25,28],
      [7,68],[7,69],[7,70],[7,71],[7,72],
      [25,68],[25,69],[25,70],[25,71],[25,72],
    ];
    mudSpots.forEach(([r,c]) => {
      if (mapData[r]?.[c] === T.SAND) mapData[r][c] = T.MUD;
    });

    // Boost pads at the far left and right sides
    [[16,6],[16,7],[16,93],[16,94]].forEach(([r,c]) => {
      if (mapData[r]?.[c] === T.SAND) mapData[r][c] = T.BOOST;
    });
  }

  _paintWallBorders(mapData) {
    const track = new Set([T.SAND, T.BOOST, T.MUD]);
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (let row = 0; row < MAP_H; row++) {
      for (let col = 0; col < MAP_W; col++) {
        if (track.has(mapData[row][col])) continue;
        const edge = dirs.some(([dr,dc]) => {
          const nr=row+dr, nc=col+dc;
          return nr>=0&&nr<MAP_H&&nc>=0&&nc<MAP_W&&track.has(mapData[nr][nc]);
        });
        if (edge) mapData[row][col] = T.WALL;
      }
    }
  }

  _drawStartLine() {
    const wps = this.trackData.waypoints;
    if (wps.length < 2) return;
    const [wp0, wp1] = wps;
    const dx = wp1.x - wp0.x, dy = wp1.y - wp0.y;
    const d = Math.sqrt(dx*dx + dy*dy);
    // Perpendicular unit vector (rotated 90°)
    const nx = -dy / d, ny = dx / d;
    const L = 200;

    const g = this.add.graphics().setDepth(5);
    g.lineStyle(6, 0xffffff, 0.9);
    g.lineBetween(wp0.x + nx*L, wp0.y + ny*L, wp0.x - nx*L, wp0.y - ny*L);
    g.lineStyle(4, 0x111111, 0.9);
    g.lineBetween(wp0.x + nx*(L-10), wp0.y + ny*(L-10), wp0.x - nx*(L-10), wp0.y - ny*(L-10));

    this.add.text(wp0.x + dx/d * 18, wp0.y + dy/d * 18, 'START/FINISH', {
      fontSize: '11px', fill: '#ffffff', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(6);
  }

  // ─── Buggy Spawning ───────────────────────────────────────────────────────

  _spawnBuggies() {
    const wp0 = this.trackData.waypoints[0] || { x: 800, y: 768 };
    const wp1 = this.trackData.waypoints[1] || { x: 400, y: 480 };
    const startAngle = Phaser.Math.RadToDeg(
      Math.atan2(wp1.y - wp0.y, wp1.x - wp0.x)
    ) + 90;

    const offsets = [{ dx:-30,dy:0 },{ dx:30,dy:0 },{ dx:0,dy:60 }];
    let humanCount = 0;

    this.playerConfigs.forEach((cfg, idx) => {
      const off = offsets[idx] || { dx: 0, dy: idx * 60 };
      const stats = { ...BUGGIES[cfg.buggyIndex ?? idx] };
      const tex   = BUGGY_TEXTURES[idx];

      let buggy;
      if (cfg.type === 'human') {
        buggy = new Buggy(this, wp0.x + off.dx, wp0.y + off.dy, tex, stats);
        buggy._humanIndex = humanCount++;
        this.humanBuggies.push(buggy);
      } else {
        buggy = new AIBuggy(
          this, wp0.x + off.dx, wp0.y + off.dy, tex, stats,
          this.trackData.waypoints, this.difficulty
        );
        this.aiBuggies.push(buggy);
      }
      buggy._buggyDataIndex = cfg.buggyIndex ?? idx;
      buggy.setAngle(startAngle);
      this.allBuggies.push(buggy);
    });
  }

  // ─── Camera ───────────────────────────────────────────────────────────────

  _setupCamera(worldW, worldH) {
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    if (this.humanBuggies.length === 1) {
      this.cameras.main.startFollow(this.humanBuggies[0], true, 0.1, 0.1);
      this.cameras.main.setZoom(1.3);
    } else if (this.humanBuggies.length >= 2) {
      this.cameras.main.setZoom(0.9);
    } else {
      // Spectator
      this.cameras.main.setZoom(0.5);
      this.cameras.main.centerOn(worldW / 2, worldH / 2);
    }
  }

  _updateSharedCamera() {
    const bs = this.humanBuggies;
    const midX = bs.reduce((s,b)=>s+b.x,0)/bs.length;
    const midY = bs.reduce((s,b)=>s+b.y,0)/bs.length;
    const maxD = Math.max(...bs.map(b=>Phaser.Math.Distance.Between(midX,midY,b.x,b.y)));
    const zoom = Phaser.Math.Clamp(350/Math.max(maxD,150), 0.4, 1.2);
    this.cameras.main.zoom = Phaser.Math.Linear(this.cameras.main.zoom, zoom, 0.05);
    this.cameras.main.scrollX = midX - this.cameras.main.width  / (2*this.cameras.main.zoom);
    this.cameras.main.scrollY = midY - this.cameras.main.height / (2*this.cameras.main.zoom);
  }

  // ─── Race Finish & Progress ───────────────────────────────────────────────

  _onRaceFinished(finishOrder) {
    // Find the best human finishing time
    const humanFinishes = finishOrder.filter(b => this.humanBuggies.includes(b));
    const humanFinished = humanFinishes.length > 0;

    let newRecord = false;
    let nextUnlocked = false;
    let nextTrackIndex = this.trackIndex + 1;

    if (humanFinished) {
      const bestTime = this.raceManager.getElapsedTime();
      newRecord = ProgressManager.saveBestTime(this.trackIndex, bestTime);

      if (nextTrackIndex < TRACKS.length) {
        nextUnlocked = ProgressManager.unlockNext(this.trackIndex);
      }
    }

    this.time.delayedCall(2500, () => {
      this.scene.start('ResultScene', {
        finishOrder: finishOrder.map((b, idx) => {
          const isHuman = this.humanBuggies.includes(b);
          const hIdx = this.humanBuggies.indexOf(b);
          return {
            name: isHuman
              ? (this.humanBuggies.length > 1 ? `Player ${hIdx+1}` : 'YOU')
              : `Robot (${BUGGIES[b._buggyDataIndex]?.name || 'AI'})`,
            isHuman,
            position: idx + 1,
            time: this.raceManager.getElapsedTime()
          };
        }),
        trackName:    this.trackData.name,
        trackIndex:   this.trackIndex,
        playerConfigs: this.playerConfigs,
        difficulty:   this.difficulty,
        nextUnlocked,
        newRecord,
        hasNextTrack: nextTrackIndex < TRACKS.length
      });
    });
  }

  // ─── Debug ────────────────────────────────────────────────────────────────

  _drawWaypointDebug() {
    const c = this.add.container(0,0).setDepth(50);
    const g = this.add.graphics();
    c.add(g);
    this.trackData.waypoints.forEach((wp, i) => {
      g.lineStyle(2, i===0 ? 0xff4444 : 0x00ff00, 0.9);
      g.strokeCircle(wp.x, wp.y, 90);
      g.fillStyle(i===0 ? 0xff4444 : 0x00ff00);
      g.fillCircle(wp.x, wp.y, 6);
      const lbl = this.add.text(wp.x+10, wp.y-12, `WP${i}`, {
        fontSize:'14px', fill: i===0?'#ff4444':'#00ff00',
        fontFamily:'monospace', stroke:'#000', strokeThickness:3
      }).setDepth(51);
      c.add(lbl);
    });
    return c;
  }

  _showFlash(text, color) {
    const {width, height} = this.cameras.main;
    const txt = this.add.text(width/2, height/2-60, text, {
      fontSize:'42px', fill:color, fontFamily:'monospace', fontStyle:'bold',
      stroke:'#000000', strokeThickness:6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
    this.tweens.add({ targets:txt, alpha:0, y:txt.y-80, duration:1200,
      onComplete:()=>txt.destroy() });
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  update(_time, delta) {
    if (this._countdownActive) return;
    if (this.raceManager.raceState === RaceState.FINISHED) return;

    // Human buggy input + fire
    this.humanBuggies.forEach((buggy, i) => {
      const keys = this.humanKeys[i];
      if (!keys) return;
      buggy.handleInput(keys, delta);

      // Fire on key just-pressed this frame (JustDown = no held-key repeat)
      if (keys.fire && Phaser.Input.Keyboard.JustDown(keys.fire) && buggy.canFire()) {
        buggy.markFired();
        this.weaponSystem.playerFire(buggy, keys);
      }
    });

    // AI update (movement + weapon firing via weaponSystem)
    this.aiBuggies.forEach(ai => ai.updateAI(delta));

    // Weapon system update (projectile movement, hit detection, homing)
    this.weaponSystem.update(delta);

    this.raceManager.update();

    const tracked = this.humanBuggies[0] || this.allBuggies[0];
    if (tracked) this.hud.update(tracked, this.raceManager.getElapsedTime());

    if (this.humanBuggies.length >= 2) this._updateSharedCamera();
  }
}
