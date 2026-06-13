import Phaser from 'phaser';

export const RaceState = {
  COUNTDOWN: 'COUNTDOWN',
  RACING: 'RACING',
  FINISHED: 'FINISHED'
};

const WAYPOINT_RADIUS = 90;  // px — how close to count as "passed"

export default class RaceManager {
  constructor(scene, buggies, waypoints, totalLaps) {
    this.scene = scene;
    this.buggies = buggies;
    this.waypoints = waypoints;
    this.totalLaps = totalLaps;
    this.raceState = RaceState.COUNTDOWN;
    this.raceStartTime = 0;
    this.finishOrder = [];
  }

  // No zones needed — we use distance checks in update()
  createWaypointZones() {}

  startRace() {
    this.raceState = RaceState.RACING;
    this.raceStartTime = this.scene.time.now;
  }

  update() {
    if (this.raceState !== RaceState.RACING) return;
    if (this.waypoints.length === 0) return;

    this.buggies.forEach(buggy => {
      if (buggy.finished) return;

      const nextIndex = (buggy.currentWaypoint + 1) % this.waypoints.length;
      const nextWP = this.waypoints[nextIndex];
      const dist = Phaser.Math.Distance.Between(buggy.x, buggy.y, nextWP.x, nextWP.y);
      const radius = buggy.getWaypointRadius ? buggy.getWaypointRadius() : WAYPOINT_RADIUS;

      if (dist < radius) {
        buggy.currentWaypoint = nextIndex;
        buggy.lastSafeX = buggy.x;
        buggy.lastSafeY = buggy.y;
        buggy.lastSafeAngle = buggy.angle;

        // Crossing waypoint 0 means completing a lap
        if (nextIndex === 0) {
          buggy.lap++;
          this.scene.events.emit('lapComplete', buggy);

          if (buggy.lap >= this.totalLaps) {
            buggy.finished = true;
            this.finishOrder.push(buggy);
            this.scene.events.emit('buggyFinished', buggy, this.finishOrder.length);

            if (this.finishOrder.length === this.buggies.length) {
              this.raceState = RaceState.FINISHED;
              this.scene.events.emit('raceFinished', this.finishOrder);
            }
          }
        }
      }
    });

    // Update race positions
    const total = this.waypoints.length;
    const sorted = [...this.buggies].sort(
      (a, b) => b.getRaceProgress(total) - a.getRaceProgress(total)
    );
    sorted.forEach((buggy, i) => { buggy.racePosition = i + 1; });
  }

  getElapsedTime() {
    if (this.raceState === RaceState.COUNTDOWN) return 0;
    return this.scene.time.now - this.raceStartTime;
  }
}
