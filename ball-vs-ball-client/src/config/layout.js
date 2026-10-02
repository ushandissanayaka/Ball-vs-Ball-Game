// Where everything stands, in world units (about one Roblox stud). North is -z: the leaderboards are at the
// north end of the hub, the runway with the duel arenas runs south from it. Props are built facing +z and
// turned by `rotation` (radians about y).

/** The deck floats high above the sea (y = 0); its shadow, and the support blocks', fall on the water. */
export const FLOOR_Y = 75;
/** The deck is a thin slab; dark support blocks hang under it (see SUPPORTS). */
export const DECK_THICKNESS = 2.4;

export const HUB = { minX: -70, maxX: 70, minZ: -60, maxZ: 60 };

/** The dark neck that links the hub's south edge to the runway lane. */
export const NECK = { topZ: 50, topHalf: 14, shoulderZ: 58, bottomZ: 68, half: 22 };

/**
 * The runway: two glass decks (a little narrower overall than the hub) either side of a dark lane. The lane
 * runs `tab` units past the decks' south end; the red ball sits at the end of that tab. Two lighter glass
 * panels flank the chevron strip for the first `panelLength` units from the hub.
 */
export const RUNWAY = { startZ: 66, endZ: 340, laneHalf: 22, outerX: 62, tab: 14, stripHalf: 8, panelLength: 125 };

/** Arena rows (z of each arena's centre), north to south, mirrored on both sides of the lane. */
export const ARENA_ROWS = [100, 150, 200, 250, 300];
export const ARENA_X = (RUNWAY.laneHalf + RUNWAY.outerX) / 2;
/** Arena base [width (x), depth (z)]. */
export const ARENA_BASE = [20, 22];
/**
 * What stands on each arena, north to south: 'pads' (two player squares, the players label, hex gems) or
 * 'match' (the standing screen the balls fight on), mixed as in the reference shots.
 */
export const ARENA_MODES = {
  W: ['pads', 'match', 'match', 'match', 'pads'],
  E: ['pads', 'pads', 'match', 'match', 'match'],
};

/** Dark blocks hanging under the deck: [x, z, width, depth], one under each arena. Nothing hangs under the hub. */
export const SUPPORTS = {
  drop: 16,
  blocks: [
    ...ARENA_ROWS.flatMap((z) => [[-ARENA_X, z, ...ARENA_BASE], [ARENA_X, z, ...ARENA_BASE]]),
  ],
};

// Stations of the starting place (the hub), placed after the top-down reference: 2V2 in the north middle,
// Flyers (north-west) and Explosions (north-east) just in front of the leaderboards, the limited shop
// (south-west) and the Balls machines (south-east) near the runway, the middle left open. Every station faces
// the middle of the hub.
export const PROPS = {
  leaderboardAllTime: { position: [-36, -49], rotation: 0.42 },
  leaderboardWeekly: { position: [36, -49], rotation: -0.42 },
  pedestals: [[-13, -37], [13, -37]],
  portal2v2: { position: [0, -20], rotation: 0 },
  flyers: { position: [-38, -14], rotation: 0.9 },
  explosions: { position: [38, -20], rotation: -0.95 },
  balls: { position: [32, 27], rotation: -2.3 },
  limitedShop: { position: [-32, 30], rotation: 2.25 },
  infoPedestal: { position: [11, 44], rotation: 0 },
};

/** The slightly darker floor panel in the open middle of the hub: [minX, minZ, maxX, maxZ]. */
export const HUB_CENTER_PANEL = [-26, -4, 26, 44];

// The sea blobs rest on the water (their lowest point at y = 0, nothing sunk), well below the deck, so their
// shadows show on the sea around them. y of a blob = radius x vertical stretch.
export const MASCOTS = {
  // A round ball perched on the outer top corner of the Top Spenders board (point in the board's own space);
  // buildLobby works out where that is.
  orange: { perch: { on: 'leaderboardAllTime', at: [-21, 28.7] }, radius: 8, stretch: [1, 1, 1], lookAt: [0, FLOOR_Y + 30, 80] },
  blue: { position: [118, 40 * 0.72, 40], radius: 40, stretch: [1, 0.72, 1], lookAt: [0, 40 * 0.72, 80] },
  pink: { position: [-104, 26 * 0.9, 214], radius: 26, stretch: [1, 0.9, 1], lookAt: [0, 26 * 0.9, 250] },
  // Resting on the far edge of the runway tab, overhanging it, looking back up the runway. Its centre is 7 past the
  // edge, so it touches the edge at 14.4 (= sqrt(16² - 7²)) below its centre.
  red: { position: [0, FLOOR_Y + 14.4, RUNWAY.endZ + RUNWAY.tab + 7], radius: 16, stretch: [1, 1, 1], lookAt: [0, FLOOR_Y + 14.4, 0] },
};

export const CAMERA = {
  fov: 55,
  position: [0, FLOOR_Y + 84, 140],
  target: [0, FLOOR_Y, -4],
  minDistance: 25,
  // Zooming out stops while the stage still fills a good part of the screen.
  maxDistance: 250,
  // Past horizontal, so the camera can look up at the deck from just above the water (see cameraControls).
  maxPolarAngle: 1.8,
  minHeight: 4,
  // The point the camera orbits may not leave this area (so the map can't be lost off-screen).
  bounds: { minX: -100, maxX: 100, minZ: -90, maxZ: 370 },
};
