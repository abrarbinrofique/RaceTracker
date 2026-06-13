// All weapon stat definitions. Referenced by WeaponSystem.
export const WEAPONS = {
  coconut: {
    id: 'coconut', label: 'Coconut Shot', tier: 'common',
    texture: 'proj-coconut',
    speed: 500, bounces: 1, lifetime: 3000,
    hitEffect: 'spinOut', hitDuration: 1200,
    poolSize: 30,
  },
  oilslick: {
    id: 'oilslick', label: 'Oil Slick', tier: 'common',
    texture: 'proj-oilslick',
    lifetime: 12000,
    hitEffect: 'spinOut', hitDuration: 800,
    poolSize: 6,
  },
  boost: {
    id: 'boost', label: 'Boost Juice', tier: 'common',
    hitEffect: 'boost', boostMult: 1.6, boostDuration: 3000,
  },
  freeze: {
    id: 'freeze', label: 'Freeze Ray', tier: 'rare',
    texture: 'proj-freeze',
    speed: 280, lifetime: 2800,
    hitEffect: 'freeze', hitDuration: 2500,
    poolSize: 6,
  },
  fireball: {
    id: 'fireball', label: 'Fireball', tier: 'rare',
    texture: 'proj-fireball',
    speed: 600, lifetime: 2500, aoeRadius: 90,
    hitEffect: 'spinOut', hitDuration: 1500,
    poolSize: 6,
  },
  dodgeball: {
    id: 'dodgeball', label: 'Dodgeball Fury', tier: 'rare',
    texture: 'proj-dodgeball',
    speed: 450, bounces: 3, lifetime: 3500, spread: 5,
    hitEffect: 'spinOut', hitDuration: 800,
    poolSize: 20,
  },
  seeker: {
    id: 'seeker', label: 'Tiki Seeker', tier: 'epic',
    texture: 'proj-seeker',
    speed: 420, turnRate: 110, lifetime: 5000,
    hitEffect: 'spinOut', hitDuration: 2500,
    poolSize: 4,
  },
};

// Position-based weapon selection weights [1st, 2nd, 3rd+]
export const WEAPON_WEIGHTS = {
  coconut:  [75, 50, 28],
  oilslick: [15, 22, 18],
  boost:    [10, 12, 12],
  freeze:   [ 0, 10, 14],
  fireball: [ 0,  6, 12],
  dodgeball:[ 0,  0, 10],
  seeker:   [ 0,  0,  6],
};
