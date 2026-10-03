// The balls a player can fight with. Stats are in the duel simulation's units (the fight box is 100 x 100;
// speed is units per second). `color` is the ball's main colour, for the 3D model and the HUD icon.
// The client and the server each keep a copy of this file: change both together.

export const BALLS = {
  electric: { name: 'Electric Ball', blurb: 'Bumps shock and freeze enemies.', hp: 95, speed: 90, radius: 7, damage: 10, color: '#1f6fe6' },
  charge: { name: 'Charge Ball', blurb: 'Wait longer, hit harder.', hp: 95, speed: 76, radius: 7.5, damage: 4, color: '#2fd3c4' },
  cell: { name: 'Cell Ball', blurb: 'Grows, then splits on death.', hp: 12, speed: 80, radius: 5.5, damage: 7, color: '#4fc760' },
  axe: { name: 'Axe Ball', blurb: 'Swings a heavy axe around it.', hp: 115, speed: 68, radius: 8, damage: 4, color: '#3b4459' },
  snake: { name: 'Snake Ball', blurb: 'Its tail bites anyone who crosses it.', hp: 90, speed: 88, radius: 6.5, damage: 7, color: '#f4f4ef' },
  spike: { name: 'Spike Ball', blurb: 'Spikes hurt anyone who touches it.', hp: 80, speed: 78, radius: 7, damage: 12, color: '#e04646' },
  fire: { name: 'Fire Ball', blurb: 'Sets enemies on fire.', hp: 90, speed: 82, radius: 7, damage: 6, color: '#f07a2a' },
  rock: { name: 'Rock Ball', blurb: 'Slow, heavy and very tough.', hp: 114, speed: 54, radius: 9.5, damage: 8, color: '#8d8a86' },
};

export const BALL_IDS = Object.keys(BALLS);

export const isBall = (id) => typeof id === 'string' && Object.hasOwn(BALLS, id);
