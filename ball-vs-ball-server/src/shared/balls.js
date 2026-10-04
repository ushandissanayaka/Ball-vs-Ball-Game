// The balls a player can fight with. Stats are in the duel simulation's units (the fight box is 100 x 100;
// speed is units per second). Every ball starts on 100; `damage` is what one ordinary bump of its takes, before
// how hard the bump was (a hit never takes more than 5: see duelSim). `color` is the ball's main colour, for the
// 3D model and the HUD icon; `rarity` ('rare', 'epic', 'legendary') colours its tile's frame on the HUD. Listed in
// the order the HUD shows them.
// The client and the server each keep a copy of this file: change both together.

export const BALLS = {
  verity: { name: 'Verity Ball', blurb: 'Hit it and it may transform.', rarity: 'legendary', hp: 100, speed: 84, radius: 9, damage: 3, color: '#f5e21c' },
  laser: { name: 'Laser Ball', blurb: 'Fills the box with laser beams.', rarity: 'legendary', hp: 100, speed: 80, radius: 9, damage: 2.4, color: '#7a2be0' },
  axe: { name: 'Axe Ball', blurb: 'Swings a heavy axe around it.', rarity: 'epic', hp: 100, speed: 76, radius: 10, damage: 2, color: '#3b4459' },
  thief: { name: 'Thief Ball', blurb: 'Throws knives that steal health.', rarity: 'epic', hp: 100, speed: 90, radius: 8.5, damage: 2.4, color: '#7c86d4' },
  spear: { name: 'Spear Ball', blurb: 'Stabs hard with a long spear.', rarity: 'epic', hp: 100, speed: 80, radius: 9, damage: 2.2, color: '#5d6470' },
  vampire: { name: 'Vampire Ball', blurb: 'Drinks health with every bite.', rarity: 'epic', hp: 100, speed: 86, radius: 9, damage: 2.9, color: '#d8202a' },
  hook: { name: 'Hook Ball', blurb: 'Hooks enemies and drags them in.', rarity: 'epic', hp: 100, speed: 82, radius: 9, damage: 2.6, color: '#5a606c' },
  poison: { name: 'Poison Spike Ball', blurb: 'Shoots poison spikes into the walls.', rarity: 'epic', hp: 100, speed: 84, radius: 9, damage: 2.4, color: '#3fbf3a' },
  burst: { name: 'Burst Ball', blurb: 'Bursts of speed and power.', rarity: 'rare', hp: 100, speed: 84, radius: 9, damage: 3.2, color: '#f2661c' },
  cell: { name: 'Cell Ball', blurb: 'Grows, then splits.', rarity: 'rare', hp: 100, speed: 82, radius: 7.5, damage: 2.7, color: '#4fc760' },
  charge: { name: 'Charge Ball', blurb: 'Wait longer, hit harder.', rarity: 'rare', hp: 100, speed: 88, radius: 9.5, damage: 3.2, color: '#2fd3c4' },
  electric: { name: 'Electric Ball', blurb: 'Bumps Stun and shock.', rarity: 'rare', hp: 100, speed: 94, radius: 9, damage: 4.2, color: '#1f86e6' },
  spider: { name: 'Spider Ball', blurb: 'Spins webs that hurt and slow.', rarity: 'rare', hp: 100, speed: 88, radius: 9, damage: 3, color: '#b3202a' },
  virus: { name: 'Virus Ball', blurb: 'Infects enemies, worse with every hit.', rarity: 'rare', hp: 100, speed: 86, radius: 8.5, damage: 2.4, color: '#3fa83a' },
  snake: { name: 'Snake Ball', blurb: 'Its tail bites anyone who crosses it.', rarity: 'rare', hp: 100, speed: 90, radius: 8.5, damage: 2.8, color: '#f1efe4' },
};

export const BALL_IDS = Object.keys(BALLS);

export const isBall = (id) => typeof id === 'string' && Object.hasOwn(BALLS, id);
