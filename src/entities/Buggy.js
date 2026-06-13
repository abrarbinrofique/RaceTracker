import Phaser from 'phaser';

export const BuggyState = {
  NORMAL:    'NORMAL',
  SPINNING:  'SPINNING',
  FROZEN:    'FROZEN',
  BOOSTING:  'BOOSTING',
  RESPAWNING:'RESPAWNING'
};

// Tile GID for mud (matches RaceScene T.MUD = 4)
const MUD_GID  = 4;
const BOOST_GID = 5;

export default class Buggy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, textureKey, stats) {
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.stats           = stats;
    this.state           = BuggyState.NORMAL;
    this.speed           = 0;
    this.currentWeapon   = 'coconut';  // unlimited baseline weapon
    this.terrainMultiplier = 1.0;
    this._fireCooldown   = 0;

    this.currentWaypoint = 0;
    this.lap             = 0;
    this.finished        = false;
    this.racePosition    = 1;

    this.lastSafeX     = x;
    this.lastSafeY     = y;
    this.lastSafeAngle = 0;

    this.setCollideWorldBounds(false);
    this.body.setSize(20, 36);
    this.body.setMaxVelocity(stats.maxSpeed * 2, stats.maxSpeed * 2);
    this.setDepth(10);

    this.drifting    = false;
    this._stateTimer = null;
  }

  handleInput(keys, delta) {
    if (this.state !== BuggyState.NORMAL && this.state !== BuggyState.BOOSTING) return;

    const dt = delta / 1000;

    // Terrain multiplier from tile (don't override while boosting)
    if (this.state !== BuggyState.BOOSTING) {
      this._updateTerrain();
    }

    const maxSpeed = this.stats.maxSpeed * this.terrainMultiplier *
      (this.state === BuggyState.BOOSTING ? 1 : 1);

    if (keys.up.isDown) {
      this.speed = Math.min(this.speed + this.stats.acceleration * dt, maxSpeed);
    } else if (keys.down.isDown) {
      this.speed = Math.max(this.speed - this.stats.deceleration * dt * 1.5, -maxSpeed * 0.4);
    } else {
      if (this.speed > 0) this.speed = Math.max(0, this.speed - this.stats.deceleration * dt);
      if (this.speed < 0) this.speed = Math.min(0, this.speed + this.stats.deceleration * dt);
    }

    const speedRatio    = Math.abs(this.speed) / this.stats.maxSpeed;
    const activeTurnRate = this.stats.turnRate * Math.max(0.3, speedRatio);
    if (keys.left.isDown)  this.angle -= activeTurnRate * dt;
    if (keys.right.isDown) this.angle += activeTurnRate * dt;

    this.drifting = keys.drift && keys.drift.isDown && Math.abs(this.speed) > 50;

    this._applyVelocity();

    // Fire cooldown
    if (this._fireCooldown > 0) this._fireCooldown -= delta;
  }

  _updateTerrain() {
    if (!this.scene.groundLayer) return;
    const tile = this.scene.groundLayer.getTileAtWorldXY(this.x, this.y);
    if (!tile) { this.terrainMultiplier = 1.0; return; }
    if (tile.index === MUD_GID)   this.terrainMultiplier = 0.55;
    else if (tile.index === BOOST_GID) this.terrainMultiplier = 1.0; // boost handled by applyBoost()
    else                          this.terrainMultiplier = 1.0;
  }

  _applyVelocity() {
    const rad = Phaser.Math.DegToRad(this.angle - 90);
    const tVX = Math.cos(rad) * this.speed;
    const tVY = Math.sin(rad) * this.speed;
    if (this.drifting) {
      const df = this.stats.driftFactor;
      this.body.velocity.x = Phaser.Math.Linear(this.body.velocity.x, tVX, 1 - df);
      this.body.velocity.y = Phaser.Math.Linear(this.body.velocity.y, tVY, 1 - df);
    } else {
      this.body.velocity.x = Phaser.Math.Linear(this.body.velocity.x, tVX, 0.25);
      this.body.velocity.y = Phaser.Math.Linear(this.body.velocity.y, tVY, 0.25);
    }
  }

  // Returns true if the buggy can fire right now
  canFire() {
    return this.currentWeapon !== null && this._fireCooldown <= 0 &&
      this.state !== BuggyState.SPINNING && this.state !== BuggyState.FROZEN &&
      this.state !== BuggyState.RESPAWNING;
  }

  markFired() {
    this._fireCooldown = 400;  // 400ms between fires
  }

  // ─── Hit effects ──────────────────────────────────────────────────────────

  spinOut(duration = 1200) {
    if (this.state === BuggyState.RESPAWNING || this.state === BuggyState.FROZEN) return;
    this._setState(BuggyState.SPINNING, duration);
    // Kill ongoing spin tweens
    this.scene.tweens.killTweensOf(this, 'angle');
    this.scene.tweens.add({
      targets: this, angle: this.angle + 720, duration, ease: 'Linear'
    });
    this.speed *= 0.15;
    this.body.velocity.scale(0.15);
  }

  freeze(duration = 2500) {
    if (this.state === BuggyState.RESPAWNING) return;
    this._setState(BuggyState.FROZEN, duration);
    this.speed = 0;
    this.body.velocity.set(0, 0);
    this.setTint(0x88ccff);
  }

  applyBoost(multiplier = 1.5, duration = 3000) {
    if (this.state === BuggyState.SPINNING || this.state === BuggyState.FROZEN) return;
    this._setState(BuggyState.BOOSTING, duration);
    this.terrainMultiplier = multiplier;
    this.setTint(0xffcc00);
    // Instantly apply speed boost
    this.speed = Math.min(this.speed * multiplier, this.stats.maxSpeed * multiplier);
  }

  respawn() {
    this._setState(BuggyState.RESPAWNING, 2000);
    this.speed = 0;
    this.body.velocity.set(0, 0);
    this.setPosition(this.lastSafeX, this.lastSafeY);
    this.angle = this.lastSafeAngle;
    this.setAlpha(0.5);
    this.scene.time.delayedCall(2000, () => {
      this.setAlpha(1);
      this._clearState();
    });
  }

  _setState(newState, duration) {
    this.state = newState;
    if (this._stateTimer) this._stateTimer.remove();
    this._stateTimer = this.scene.time.delayedCall(duration, () => this._clearState());
  }

  _clearState() {
    this.state           = BuggyState.NORMAL;
    this.terrainMultiplier = 1.0;
    this.clearTint();
    this._stateTimer = null;
  }

  getWaypointRadius()      { return 90; }

  getRaceProgress(total) {
    return this.lap * total + this.currentWaypoint;
  }
}
