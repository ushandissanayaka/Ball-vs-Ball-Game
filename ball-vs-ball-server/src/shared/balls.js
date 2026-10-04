// The balls a player can fight with. Stats are in the duel simulation's units (the fight box is 100 x 100;
// speed is units per second). Every ball starts on 100; `damage` is what one ordinary bump of its takes, before
// how hard the bump was (a hit never takes more than 5: see duelSim). `color` is the ball's main colour, for the
// 3D model and the HUD icon.
// The client and the server each keep a copy of this file: change both together.

export const BALLS = {
  verity: { name: 'Verity Ball', blurb: 'Hit it and it may transform.', hp: 100, speed: 84, radius: 9, damage: 3, color: '#f2e62a' },
  electric: { name: 'Electric Ball', blurb: 'Bumps shock and freeze enemies.', hp: 100, speed: 94, radius: 9, damage: 4, color: '#1f6fe6' },
  charge: { name: 'Charge Ball', blurb: 'Wait longer, hit harder.', hp: 100, speed: 88, radius: 9.5, damage: 3.1, color: '#2fd3c4' },
  cell: { name: 'Cell Ball', blurb: 'Grows, then splits on death.', hp: 100, speed: 82, radius: 7.5, damage: 2.7, color: '#4fc760' },
  axe: { name: 'Axe Ball', blurb: 'Swings a heavy axe around it.', hp: 100, speed: 76, radius: 10, damage: 2, color: '#3b4459' },
  snake: { name: 'Snake Ball', blurb: 'Its tail bites anyone who crosses it.', hp: 100, speed: 90, radius: 8.5, damage: 2.5, color: '#f4f4ef' },
  spike: { name: 'Spike Ball', blurb: 'Spikes hurt anyone who touches it.', hp: 100, speed: 80, radius: 9, damage: 3.6, color: '#e04646' },
  fire: { name: 'Fire Ball', blurb: 'Sets enemies on fire.', hp: 100, speed: 86, radius: 9, damage: 2.5, color: '#f07a2a' },
  rock: { name: 'Rock Ball', blurb: 'Slow, heavy and very tough.', hp: 100, speed: 62, radius: 12, damage: 4, color: '#8d8a86' },
};

export const BALL_IDS = Object.keys(BALLS);

export const isBall = (id) => typeof id === 'string' && Object.hasOwn(BALLS, id);
