// Colours picked from the reference screenshots. Everything in the world takes its colours from here.

export const SKY = {
  zenith: '#1d86e3',
  mid: '#4fa6ec',
  horizon: '#93c9f1',
  haze: '#bfe0f7',
  cloud: '#ffffff',
  cloudShade: '#b9cfe6',
};

export const SEA = {
  base: '#3d93da',
  far: '#5aa8e2',
  deep: '#2a6cb6',
};

export const PLATFORM = {
  glass: '#21488a',
  centerPanel: '#16386e',
  side: '#182a52',
  underside: '#16244a',
  insetLine: '#6aa0e6',
  lane: '#24365f',
  laneEdge: '#4a6aa6',
  neck: '#22335c',
  conveyor: '#212b47', // the conveyor strips' dark belt
  conveyorArrow: '#cfd9ee', // their chevrons, brightest at the tip

};

export const NEON = {
  cyan: '#62ecff',
  pink: '#ff8fc9',
  blue: '#7ccaff',
  red: '#ff3b5c',
  white: '#dff8ff',
};

export const PROP = {
  plinth: '#1c2742',
  plinthTrim: '#3b5590',
  boardFrame: '#3a2ed6',
  boardStand: '#1b2350',
  arenaFrame: '#1a2340',
  arenaScreen: '#1f2d52',
  pillar: '#1d2846',
  cardboard: '#c8a15f',
  cardboardFlap: '#b48a48',
  tvBody: '#8b55dc',
  tvDark: '#2b1f4f',
  machineDark: '#343a4a',
  machineDarkTrim: '#555d70',
  machineRed: '#d7343f',
  machineRedTrim: '#a3202b',
  gold: '#f5b82e',
  diamond: '#3aa8ff',
  chainDark: '#2a2d36',
  shopRed: '#4a0d16',
};

export const MASCOT = {
  orange: '#e2683b',
  red: '#e8475a',
  blue: '#2b62c6',
  pink: '#d987d6',
  eyeRing: '#ffffff',
  eye: '#8fd3ff',
  eyeRim: '#151c30',
  eyePale: '#dce8f6',
};

/** The duel box: its deep navy frame, the slate back the balls fight against, and the blue VS screen. */
export const DUEL_BOX = {
  frame: '#121a2e',
  wall: '#26375a',
  inset: '#22314f',
  insetDark: '#111a2e',
  screen: '#2a2ad8',
  scanline: 'rgba(120, 140, 255, 0.35)',
};

/** Duel effects: damage numbers, the smoke that bursts round a player hit by the winning ball. */
export const DUEL_FX = {
  damage: '#ff2a2a',
  heal: '#5cff4a',
  smoke: '#16181f',
  smokeLight: '#2c303b',
  ember: '#ff8a2a',
  spark: '#ffffff',
  heart: '#e8232f',
};

/** Ball colours used in the gacha machines and on the arena screens. */
export const BALL_COLORS = ['#2f6fe0', '#e04646', '#3fbf5a', '#f2c230', '#9b59d6', '#f07a2a', '#29c3d6', '#ff7fbf', '#f4f6fb', '#2a2f40'];

/** Floating label styles: [top colour, bottom colour] fill and outline. */
export const LABEL = {
  station: { fill: ['#e6f0ff', '#8db2f6'], stroke: '#18203f' },
  offer: { fill: ['#ffb3bf', '#ff6d85'], stroke: '#4d0b19' },
  arena: { fill: ['#ffffff', '#dfe8ff'], stroke: '#141a30' },
  reward: { fill: ['#ffe27a', '#ffb31a'], stroke: '#3a2400' },
};
