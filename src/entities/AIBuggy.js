import Phaser from 'phaser';
import Buggy, { BuggyState } from './Buggy.js';

const DIFFICULTY_PARAMS = {
  easy: {
    steerAccuracy: 0.55,
    lookAheadBrake: 0.50,
    rubberBandLast: 1.00,
    rubberBandFirst: 0.72,  // leader runs at 72% of max → player overtakes easily
    reactionDelay: 5000,    // fires every 5s max — much less coconut harassment
    waypointRadius: 140,
  },
  medium: {
    steerAccuracy: 0.72,
    lookAheadBrake: 0.62,
    rubberBandLast: 1.05,
    rubberBandFirst: 0.82,
    reactionDelay: 3000,
    waypointRadius: 115,
  },
  hard: {
    steerAccuracy: 0.88,
    lookAheadBrake: 0.74,
    rubberBandLast: 1.10,
    rubberBandFirst: 0.90,
    reactionDelay: 1500,
    waypointRadius: 95,
  }
};

export default class AIBuggy extends Buggy {
  constructor(scene, x, y, textureKey, stats, waypoints, difficulty = 'medium') {
    super(scene, x, y, textureKey, stats);
    this.waypoints = waypoints;
    this.p = DIFFICULTY_PARAMS[difficulty] || DIFFICULTY_PARAMS.medium;
    this._weaponFireTimer = 0;
    this._stuckTimer = 0;
    this._lastPos = { x, y };
  }

  updateAI(delta) {
    if (this.waypoints.length === 0) return;
    if (this.state === BuggyState.RESPAWNING) return;
    if (this.finished) return;

    const dt = delta / 1000;

    if (this.state === BuggyState.SPINNING || this.state === BuggyState.FROZEN) {
      // While knocked out: slow to a stop naturally
      this.speed *= Math.max(0, 1 - dt * 3);
      this._applyVelocity();
      return;
    }

    this._steerToWaypoint(dt);
    this._controlSpeed(dt);
    this._applyVelocity();
    this._checkStuck(dt);
    this._tryFireWeapon(delta);
  }

  _steerToWaypoint(dt) {
    const nextIndex = (this.currentWaypoint + 1) % this.waypoints.length;
    const target = this.waypoints[nextIndex];

    // Angle from buggy to next waypoint (Phaser angle: 0=right, 90=down, -90=up)
    const targetAngleDeg = Phaser.Math.RadToDeg(
      Math.atan2(target.y - this.y, target.x - this.x)
    ) + 90;  // +90 because sprite texture faces up at angle=0

    const angleDiff = Phaser.Math.Angle.WrapDegrees(targetAngleDeg - this.angle);
    const maxTurn = this.stats.turnRate * dt * this.p.steerAccuracy;
    const turn = Phaser.Math.Clamp(angleDiff, -maxTurn, maxTurn);
    this.angle += turn;
  }

  _controlSpeed(dt) {
    const nextIndex = (this.currentWaypoint + 1) % this.waypoints.length;
    const nextNextIndex = (nextIndex + 1) % this.waypoints.length;

    const curr = this.waypoints[nextIndex];
    const ahead = this.waypoints[nextNextIndex];

    // Look-ahead: angle between current direction and next turn
    const currAngle = Phaser.Math.RadToDeg(Math.atan2(curr.y - this.y, curr.x - this.x));
    const nextAngle = Phaser.Math.RadToDeg(Math.atan2(ahead.y - curr.y, ahead.x - curr.x));
    const turnSharpness = Math.abs(Phaser.Math.Angle.WrapDegrees(nextAngle - currAngle));

    // Speed factor: reduce before sharp corners
    let speedFactor = 1.0;
    if (turnSharpness > 80) speedFactor = this.p.lookAheadBrake;
    else if (turnSharpness > 45) speedFactor = Phaser.Math.Linear(1.0, this.p.lookAheadBrake, (turnSharpness - 45) / 35);

    // Rubber banding based on race position (set by RaceManager each frame)
    let rubberBand = 1.0;
    const pos = this.racePosition;
    const total = 3; // max racers
    if (pos >= total)      rubberBand = this.p.rubberBandLast;
    else if (pos <= 1)     rubberBand = this.p.rubberBandFirst;

    const targetSpeed = this.stats.maxSpeed * speedFactor * rubberBand * this.terrainMultiplier;

    // Accelerate toward target speed
    if (this.speed < targetSpeed) {
      this.speed = Math.min(this.speed + this.stats.acceleration * dt, targetSpeed);
    } else {
      this.speed = Math.max(this.speed - this.stats.deceleration * dt * 0.5, targetSpeed);
    }
    if (this.speed < 0) this.speed = 0;
  }

  _applyVelocity() {
    const rad = Phaser.Math.DegToRad(this.angle - 90);
    const targetVX = Math.cos(rad) * this.speed;
    const targetVY = Math.sin(rad) * this.speed;
    this.body.velocity.x = Phaser.Math.Linear(this.body.velocity.x, targetVX, 0.2);
    this.body.velocity.y = Phaser.Math.Linear(this.body.velocity.y, targetVY, 0.2);
  }

  // Detects if AI is stuck (not moving) and nudges it
  _checkStuck(dt) {
    const moved = Phaser.Math.Distance.Between(this.x, this.y, this._lastPos.x, this._lastPos.y);
    this._lastPos = { x: this.x, y: this.y };

    if (this.speed > 50 && moved < 1.5) {
      this._stuckTimer += dt;
      if (this._stuckTimer > 1.2) {
        // Reverse briefly
        this.angle += 25;
        this.speed *= -0.5;
        this._stuckTimer = 0;
      }
    } else {
      this._stuckTimer = Math.max(0, this._stuckTimer - dt * 2);
    }
  }

  _tryFireWeapon(delta) {
    if (!this.currentWeapon || !this.canFire()) return;
    this._weaponFireTimer += delta;
    if (this._weaponFireTimer >= this.p.reactionDelay) {
      this._weaponFireTimer = 0;
      // Check a rival is nearby before firing (don't waste on empty track)
      const hasTarget = this.scene.weaponSystem &&
        this.scene.allBuggies.some(b => b !== this &&
          Phaser.Math.Distance.Between(this.x, this.y, b.x, b.y) < 500);
      if (hasTarget || this.currentWeapon === 'oilslick' || this.currentWeapon === 'boost') {
        this.markFired();
        this.scene.weaponSystem?.aiFire(this);
      }
    }
  }

  // Override: AI waypoint advancement is handled by RaceManager distance check,
  // so we also update our own waypointRadius for use there.
  getWaypointRadius() {
    return this.p.waypointRadius;
  }
}
