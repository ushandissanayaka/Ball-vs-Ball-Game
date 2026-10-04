// The balls a player can fight with. Stats are in the duel simulation's units (the fight box is 100 x 100;
// speed is units per second). Every ball starts on 100; `damage` is what one ordinary bump of its takes, before
// how hard the bump was (a hit never takes more than 5: see duelSim). `color` is the ball's main colour, for the
// 3D model and the HUD icon; `rarity` ('rare', 'epic', 'legendary') colours its tile's frame on the HUD. Listed in
// the order the HUD shows them.
// The client and the server each keep a copy of this file: change both together.

export const BALLS = {
  verity: { name: 'Verity Ball', blurb: 'Hit it and it may transform.', rarity: 'legendary', hp: 100, speed: 84, radius: 9, damage: 3, color: '#f5e21c' },
  axe: { name: 'Axe Ball', blurb: 'Swings a heavy axe around it.', rarity: 'epic', hp: 100, speed: 76, radius: 10, damage: 2, color: '#3b4459' },
  thief: { name: 'Thief Ball', blurb: 'Steals health with every hit.', rarity: 'epic', hp: 100, speed: 90, radius: 8.5, damage: 2.4, color: '#7c86d4' },
  burst: { name: 'Burst Ball', blurb: 'Bursts of speed and power.', rarity: 'rare', hp: 100, speed: 84, radius: 9, damage: 3.2, color: '#f2661c' },
  cell: { name: 'Cell Ball', blurb: 'Grows, then splits.', rarity: 'rare', hp: 100, speed: 82, radius: 7.5, damage: 2.7, color: '#4fc760' },
  charge: { name: 'Charge Ball', blurb: 'Wait longer, hit harder.', rarity: 'rare', hp: 100, speed: 88, radius: 9.5, damage: 3.1, color: '#2fd3c4' },
  electric: { name: 'Electric Ball', blurb: 'Bumps Stun and shock.', rarity: 'rare', hp: 100, speed: 94, radius: 9, damage: 4, color: '#1f86e6' },
  spider: { name: 'Spider Ball', blurb: 'Webs slow its enemies down.', rarity: 'rare', hp: 100, speed: 88, radius: 9, damage: 3.5, color: '#b3202a' },
};

export const BALL_IDS = Object.keys(BALLS);

export const isBall = (id) => typeof id === 'string' && Object.hasOwn(BALLS, id);
