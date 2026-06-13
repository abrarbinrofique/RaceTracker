import Phaser from 'phaser';

const RESPAWN_MS = 10000;

export default class WeaponCrate extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'weapon-crate');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);  // static body

    this.setDepth(8);
    this._respawnTimer = null;

    // Spin tween
    scene.tweens.add({
      targets: this,
      angle: 360,
      duration: 1800,
      repeat: -1,
      ease: 'Linear'
    });

    // Hover tween
    scene.tweens.add({
      targets: this,
      y: y - 6,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  pickup() {
    this.setActive(false).setVisible(false);
    this.body.enable = false;

    this._respawnTimer = this.scene.time.delayedCall(RESPAWN_MS, () => {
      this.setActive(true).setVisible(true);
      this.body.enable = true;
      // Pop-in scale effect
      this.setScale(0);
      this.scene.tweens.add({
        targets: this, scaleX: 1, scaleY: 1, duration: 300, ease: 'Back.easeOut'
      });
    });
  }
}
