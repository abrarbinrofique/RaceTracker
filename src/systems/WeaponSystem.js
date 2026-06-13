import Phaser from 'phaser';
import WeaponCrate from '../entities/WeaponCrate.js';
import { WEAPONS, WEAPON_WEIGHTS } from '../data/weapons.js';

export default class WeaponSystem {
  constructor(scene, allBuggies, groundLayer) {
    this.scene       = scene;
    this.allBuggies  = allBuggies;
    this.groundLayer = groundLayer;

    // Projectile pool: { sprite, cfg, owner, age, bounceLeft, seekTarget }
    this._active = [];

    // Oil slick pool (static placed sprites — not physics projectiles)
    this._slicks = [];

    this._buildPools();
    this._crates = [];
  }

  // ─── Setup ────────────────────────────────────────────────────────────────

  _buildPools() {
    // Pre-allocate sprite pools for each projectile weapon
    const projectileWeapons = ['coconut','freeze','fireball','dodgeball','seeker'];
    this._pools = {};
    projectileWeapons.forEach(id => {
      const cfg = WEAPONS[id];
      const grp = this.scene.physics.add.group({ runChildUpdate: false });
      for (let i = 0; i < cfg.poolSize; i++) {
        const s = this.scene.physics.add.image(-9999, -9999, cfg.texture);
        s.setActive(false).setVisible(false);
        s.body.enable = false;
        grp.add(s);
      }
      this._pools[id] = grp;
    });

    // Oil slick static pool
    this._slickGroup = this.scene.physics.add.staticGroup();
    for (let i = 0; i < 6; i++) {
      const s = this.scene.physics.add.staticImage(-9999, -9999, 'proj-oilslick');
      s.setActive(false).setVisible(false);
      s.body.enable = false;
      this._slickGroup.add(s);
    }
  }

  spawnCrates(spawns) {
    spawns.forEach(pos => {
      const crate = new WeaponCrate(this.scene, pos.x, pos.y);
      this._crates.push(crate);

      // Overlap: any buggy touching a crate picks it up
      this.scene.physics.add.overlap(this.allBuggies, crate, (buggy, _crate) => {
        if (!crate.active) return;
        if (buggy.finished) return;
        // Replace existing weapon (silent), assign new one
        buggy.currentWeapon = this._selectWeapon(buggy);
        crate.pickup();
      });
    });
  }

  // ─── Weapon Selection ─────────────────────────────────────────────────────

  _selectWeapon(buggy) {
    const posIdx = Math.max(0, Math.min(2, (buggy.racePosition || 1) - 1));
    const entries = Object.entries(WEAPON_WEIGHTS);
    const total   = entries.reduce((s, [, w]) => s + w[posIdx], 0);
    let roll = Math.random() * total;
    for (const [id, weights] of entries) {
      roll -= weights[posIdx];
      if (roll <= 0) return id;
    }
    return 'coconut';
  }

  // ─── Fire API ─────────────────────────────────────────────────────────────

  // Called by RaceScene for human input (pass keys for coconut tap vs hold-rear)
  playerFire(buggy, keys) {
    if (!buggy.currentWeapon) return;
    const w = buggy.currentWeapon;

    if (w === 'boost') { this._fireBoost(buggy); return; }
    if (w === 'oilslick') { this._fireOilSlick(buggy); return; }

    const rear = (w === 'coconut') && keys.down && keys.down.isDown;
    this._fireProjectile(w, buggy, rear);
  }

  // Called by AIBuggy
  aiFire(buggy) {
    if (!buggy.currentWeapon) return;
    const w = buggy.currentWeapon;
    if (w === 'boost')    { this._fireBoost(buggy); return; }
    if (w === 'oilslick') { this._fireOilSlick(buggy); return; }
    this._fireProjectile(w, buggy, false);
  }

  // ─── Weapon Implementations ───────────────────────────────────────────────

  _fireBoost(buggy) {
    buggy.currentWeapon = 'coconut';
    buggy.applyBoost(WEAPONS.boost.boostMult, WEAPONS.boost.boostDuration);
    this._spawnFX('fx-explosion', buggy.x, buggy.y, 0.6, 0xffaa00);
  }

  _fireOilSlick(buggy) {
    buggy.currentWeapon = 'coconut';
    const rad    = Phaser.Math.DegToRad(buggy.angle - 90);
    const behind = 40;
    const sx     = buggy.x - Math.cos(rad) * behind;
    const sy     = buggy.y - Math.sin(rad) * behind;

    // Get a free slick from pool
    const slick = this._slickGroup.getFirstDead(false);
    if (!slick) return;

    slick.setPosition(sx, sy).setActive(true).setVisible(true).setDepth(4);
    slick.body.enable = true;
    slick.body.reset(sx, sy);

    // Slick expires after 12s
    const expireTimer = this.scene.time.delayedCall(WEAPONS.oilslick.lifetime, () => {
      slick.setActive(false).setVisible(false);
      slick.body.enable = false;
    });

    // Overlap: any buggy (not owner) that rolls over it
    const ovlp = this.scene.physics.add.overlap(this.allBuggies, slick, (hitBuggy) => {
      if (hitBuggy === buggy) return;
      hitBuggy.spinOut(WEAPONS.oilslick.hitDuration);
      this._spawnFX('fx-explosion', hitBuggy.x, hitBuggy.y, 0.5, 0x330033);
      // Remove slick after first hit
      slick.setActive(false).setVisible(false);
      slick.body.enable = false;
      expireTimer.remove();
      this.scene.physics.world.removeCollider(ovlp);
    });
  }

  _fireProjectile(weaponId, buggy, rear = false) {
    const cfg  = WEAPONS[weaponId];
    const pool = this._pools[weaponId];
    if (!cfg || !pool) return;

    buggy.currentWeapon = 'coconut';

    const rad    = Phaser.Math.DegToRad(buggy.angle - 90);
    const offset = rear ? -50 : 50;
    const startX = buggy.x + Math.cos(rad) * offset;
    const startY = buggy.y + Math.sin(rad) * offset;
    const dir    = rear ? -1 : 1;

    if (weaponId === 'dodgeball') {
      // 5-ball spread
      const spreads = [-20, -10, 0, 10, 20];
      spreads.forEach(deg => this._spawnOne(cfg, pool, buggy, startX, startY, dir, deg));
    } else {
      this._spawnOne(cfg, pool, buggy, startX, startY, dir, 0);
    }
  }

  _spawnOne(cfg, pool, owner, x, y, dir, extraDeg) {
    const sprite = pool.get(x, y, cfg.texture);
    if (!sprite) return;

    sprite.setActive(true).setVisible(true).setDepth(15);
    sprite.body.enable = true;
    sprite.body.reset(x, y);

    const angle = owner.angle + extraDeg;
    const rad   = Phaser.Math.DegToRad(angle - 90);
    const vx    = Math.cos(rad) * cfg.speed * dir;
    const vy    = Math.sin(rad) * cfg.speed * dir;
    sprite.setVelocity(vx, vy);
    sprite.setRotation(Phaser.Math.DegToRad(angle));

    if (cfg.bounces !== undefined) {
      sprite.body.setBounce(1, 1);
      sprite.body.setCollideWorldBounds(true);
    }

    const entry = {
      sprite, cfg, owner,
      age:        0,
      bounceLeft: cfg.bounces ?? -1,
      lastVel:    { x: vx, y: vy },
    };

    // For seeker: find target (nearest rival ahead in position)
    if (cfg.id === 'seeker') {
      entry.seekTarget = this._findSeekerTarget(owner);
    }

    // Overlap with wall tiles — non-bouncing projectiles deactivate
    if (cfg.bounces === undefined) {
      this.scene.physics.add.collider(sprite, this.groundLayer, () => {
        if (sprite.active) this._deactivate(entry);
      });
    }

    this._active.push(entry);
  }

  _findSeekerTarget(owner) {
    // Target the buggy directly ahead of the owner in race order
    const rivals = this.allBuggies.filter(b => b !== owner && !b.finished);
    if (!rivals.length) return null;
    // Closest ahead by position, or just closest
    return rivals.sort((a, b) =>
      Phaser.Math.Distance.Between(owner.x, owner.y, a.x, a.y) -
      Phaser.Math.Distance.Between(owner.x, owner.y, b.x, b.y)
    )[0];
  }

  // ─── Update Loop ──────────────────────────────────────────────────────────

  update(delta) {
    const toRemove = [];

    this._active.forEach((entry, i) => {
      const { sprite, cfg, owner } = entry;
      if (!sprite.active) { toRemove.push(i); return; }

      entry.age += delta;

      // Lifetime expiry
      if (entry.age > cfg.lifetime) {
        this._deactivate(entry);
        toRemove.push(i);
        return;
      }

      // Homing logic (Tiki Seeker)
      if (cfg.id === 'seeker' && entry.seekTarget) {
        const tgt = entry.seekTarget;
        if (!tgt.active || tgt.finished) {
          entry.seekTarget = this._findSeekerTarget(owner);
        } else {
          const desiredAngle = Phaser.Math.RadToDeg(
            Math.atan2(tgt.y - sprite.y, tgt.x - sprite.x)
          );
          const currentAngle = Phaser.Math.RadToDeg(Math.atan2(sprite.body.velocity.y, sprite.body.velocity.x));
          const diff = Phaser.Math.Angle.WrapDegrees(desiredAngle - currentAngle);
          const maxTurn = cfg.turnRate * (delta / 1000);
          const turn = Phaser.Math.Clamp(diff, -maxTurn, maxTurn);
          const newAngle = Phaser.Math.DegToRad(currentAngle + turn);
          sprite.setRotation(newAngle + Math.PI / 2);
          sprite.setVelocity(Math.cos(newAngle) * cfg.speed, Math.sin(newAngle) * cfg.speed);
        }
      }

      // Bounce tracking for coconut/dodgeball
      if (cfg.bounces !== undefined && cfg.bounces >= 0) {
        const vx = sprite.body.velocity.x;
        const vy = sprite.body.velocity.y;
        const bounced =
          Math.sign(vx) !== Math.sign(entry.lastVel.x) ||
          Math.sign(vy) !== Math.sign(entry.lastVel.y);
        if (bounced) {
          entry.bounceLeft--;
          if (entry.bounceLeft < 0) {
            this._deactivate(entry);
            toRemove.push(i);
            return;
          }
        }
        entry.lastVel = { x: vx, y: vy };
      }

      // Hit detection vs all buggies
      this.allBuggies.forEach(buggy => {
        if (buggy === owner) return;
        if (!buggy.active) return;
        const dist = Phaser.Math.Distance.Between(sprite.x, sprite.y, buggy.x, buggy.y);
        const hitRadius = cfg.aoeRadius ? cfg.aoeRadius * 0.5 : 22;
        if (dist < hitRadius) {
          this._onHit(entry, buggy);
          toRemove.push(i);
        }
      });
    });

    // Remove deactivated entries (reverse order to preserve indices)
    toRemove.sort((a, b) => b - a).forEach(i => this._active.splice(i, 1));
  }

  _onHit(entry, hitBuggy) {
    const { sprite, cfg, owner } = entry;
    if (!sprite.active) return;

    // Apply hit effect
    if (cfg.hitEffect === 'spinOut') hitBuggy.spinOut(cfg.hitDuration);
    if (cfg.hitEffect === 'freeze')  hitBuggy.freeze(cfg.hitDuration);

    // AOE for fireball
    if (cfg.aoeRadius) {
      this.allBuggies.forEach(b => {
        if (b === hitBuggy || b === owner) return;
        const d = Phaser.Math.Distance.Between(sprite.x, sprite.y, b.x, b.y);
        if (d < cfg.aoeRadius) b.spinOut(cfg.hitDuration * 0.6);
      });
      this._spawnFX('fx-explosion', sprite.x, sprite.y, 1.2);
    } else if (cfg.hitEffect === 'freeze') {
      this._spawnFX('fx-freeze', sprite.x, sprite.y, 1.0, 0x88eeff);
    } else {
      this._spawnFX('fx-explosion', sprite.x, sprite.y, 0.8, 0xff8800);
    }

    this._deactivate(entry);
  }

  _deactivate(entry) {
    const { sprite } = entry;
    sprite.setActive(false).setVisible(false);
    sprite.body.enable = false;
    sprite.setVelocity(0, 0);
  }

  _spawnFX(texture, x, y, scale = 1, tint = null) {
    const fx = this.scene.add.image(x, y, texture).setDepth(20).setScale(scale);
    if (tint) fx.setTint(tint);
    this.scene.tweens.add({
      targets: fx, alpha: 0, scale: scale * 2, duration: 400,
      onComplete: () => fx.destroy()
    });
  }
}
