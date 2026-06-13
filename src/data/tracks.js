export const TRACKS = [
  {
    id: 'crab-cove',
    name: 'Crab Cove',
    theme: 'beach',
    laps: 5,
    bgColor: 0x87ceeb,
    // Rectangular stadium circuit. World 3200×1024 (100×32 tiles × 32px).
    // Left vertical: cols 3-11. Right: cols 89-97. Top: rows 3-9. Bottom: rows 23-29.
    // Clockwise: start on left side, go DOWN → right along bottom → UP → left along top.
    waypoints: [
      { x: 224,  y: 400 },  // WP0 — left side, start/finish (going south)
      { x: 224,  y: 832 },  // WP1 — bottom-left corner
      { x: 1600, y: 832 },  // WP2 — bottom straight center
      { x: 2976, y: 832 },  // WP3 — bottom-right corner
      { x: 2976, y: 512 },  // WP4 — right side center
      { x: 2976, y: 192 },  // WP5 — top-right corner
      { x: 1600, y: 192 },  // WP6 — top straight center
      { x: 224,  y: 192 },  // WP7 — top-left corner
    ],
    crateSpawns: [
      { x: 800,  y: 192 },
      { x: 1600, y: 192 },
      { x: 2400, y: 192 },
      { x: 800,  y: 832 },
      { x: 1600, y: 832 },
      { x: 2400, y: 832 },
    ]
  },
  {
    id: 'dino-jungle',
    name: 'Dino Jungle',
    theme: 'jungle',
    laps: 5,
    bgColor: 0x1a3a0a,
    // Larger figure-8. Left loop center=(896,512), Right=(2304,512).
    // World: 3200x1024. Counterclockwise left loop, clockwise right loop.
    waypoints: [
      { x: 1400, y: 512 },  // WP0 — crossover left, start/finish
      { x: 896,  y: 256 },  // WP1 — top of left loop
      { x: 272,  y: 512 },  // WP2 — left side
      { x: 896,  y: 768 },  // WP3 — bottom of left loop
      { x: 1800, y: 512 },  // WP4 — crossover right
      { x: 2304, y: 256 },  // WP5 — top of right loop
      { x: 2928, y: 512 },  // WP6 — right side
      { x: 2304, y: 768 },  // WP7 — bottom of right loop
    ],
    crateSpawns: [
      { x: 272,  y: 512 },
      { x: 896,  y: 256 },
      { x: 896,  y: 768 },
      { x: 1600, y: 512 },
      { x: 2304, y: 256 },
      { x: 2928, y: 512 },
      { x: 2304, y: 768 },
    ]
  },
  {
    id: 'volcano-run',
    name: 'Volcano Run',
    theme: 'volcano',
    laps: 3,
    bgColor: 0x3d1a0a,
    waypoints: [],
    crateSpawns: []
  }
];

export const TERRAIN_SPEED = {
  sand: 1.0,
  water: 0.55,  // mud / water — slow
  boost: 1.5
};
