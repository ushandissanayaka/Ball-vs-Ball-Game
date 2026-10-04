// Everything a player can own: balls, explosions (the burst a won duel ends with) and flyers (what they ride),
// each with the rarity that colours its tile's frame. Lists show them by rarity (mythic first), then in this
// order. `small` marks the long names the reference sets in a smaller size.
// The client and the server each keep a copy of this file: change both together.

export const RARITY_ORDER = ['mythic', 'legendary', 'epic', 'rare', 'uncommon'];

export const CATALOG = {
  verity: { name: 'Verity Ball', rarity: 'legendary', blurb: 'Hit it and it may transform.' },
  thief: { name: 'Thief Ball', rarity: 'epic', blurb: 'Throws knives that steal health.' },
  axe: { name: 'Axe Ball', rarity: 'epic', blurb: 'Swings a heavy axe around it.' },
  electric: { name: 'Electric Ball', rarity: 'rare', blurb: 'Bumps stun and shock.' },
  vampire: { name: 'Vampire Ball', rarity: 'rare', blurb: 'Drinks health with every bite.' },
  burst: { name: 'Burst Ball', rarity: 'rare', blurb: 'Bursts of speed and power.' },
  cell: { name: 'Cell Ball', rarity: 'rare', blurb: 'Grows, then splits.' },
  charge: { name: 'Charge Ball', rarity: 'rare', blurb: 'Wait longer, hit harder.' },
  spider: { name: 'Spider Ball', rarity: 'rare', blurb: 'Spins webs that hurt and slow.' },
  lightwing: { name: 'Lightwing Ball', rarity: 'mythic', small: true, blurb: 'Strikes on wings of light.' },
  shackles: { name: 'Shackles Ball', rarity: 'mythic', small: true, blurb: 'Chains its enemies in place.' },
  beam: { name: 'Beam Ball', rarity: 'legendary', blurb: 'Fires a beam straight through.' },
  glass: { name: 'Glass Ball', rarity: 'legendary', blurb: 'Shatters into sharp shards.' },
  potion: { name: 'Potion Ball', rarity: 'legendary', blurb: 'Throws potions with random effects.' },
  hive: { name: 'Hive Ball', rarity: 'legendary', blurb: 'Sends out a swarm of bees.' },
  chess: { name: 'Chess Ball', rarity: 'legendary', blurb: 'Every move is planned.' },
  orbit: { name: 'Orbit Ball', rarity: 'legendary', blurb: 'Moons circle it and hit back.' },
  harpoon: { name: 'Harpoon Ball', rarity: 'legendary', small: true, blurb: 'Spears enemies from afar.' },
  wdc: { name: 'WDC', rarity: 'epic', blurb: 'Walls in its enemies.' },
  cactus: { name: 'Cactus Ball', rarity: 'epic', blurb: 'Prickly to touch.' },
  icecone: { name: 'Ice Cone Ball', rarity: 'epic', blurb: 'Freezes what it hits.' },
  conductor: { name: 'Conductor Ball', rarity: 'epic', small: true, blurb: 'Calls in the train.' },
  shuriken: { name: 'Shuriken Ball', rarity: 'epic', small: true, blurb: 'Throws spinning stars.' },
  fibonacci: { name: 'Fibonacci Ball', rarity: 'epic', small: true, blurb: 'Grows in a golden spiral.' },
  poison: { name: 'Poison Spike Ball', rarity: 'epic', small: true, blurb: 'Shoots poison spikes into the walls.' },
  laser: { name: 'Laser Ball', rarity: 'epic', blurb: 'Fills the box with laser beams.' },
  cannon: { name: 'Cannon Ball', rarity: 'epic', blurb: 'Fires heavy cannon shots.' },
  bomb: { name: 'Bomb Ball', rarity: 'epic', blurb: 'Explodes on impact.' },
  apple: { name: 'Apple Ball', rarity: 'epic', blurb: 'An apple a day keeps it alive.' },
  spear: { name: 'Spear Ball', rarity: 'epic', blurb: 'Stabs hard with a long spear.' },
  dice: { name: 'Dice Ball', rarity: 'epic', blurb: 'Rolls a random power.' },
  frost: { name: 'Frost Ball', rarity: 'rare', blurb: 'Slows enemies with frost.' },
  blade: { name: 'Blade Ball', rarity: 'rare', blurb: 'Slices with a sharp blade.' },
  zone: { name: 'Zone Ball', rarity: 'rare', blurb: 'Hurts anyone inside its zone.' },
  bigspike: { name: 'Big Spike Ball', rarity: 'rare', small: true, blurb: 'Grows big spikes.' },
  reforge: { name: 'Reforge Ball', rarity: 'rare', blurb: 'Forges a new weapon each round.' },
  bow: { name: 'Bow Ball', rarity: 'rare', blurb: 'Shoots arrows.' },
  machinegun: { name: 'Machine Gun Ball', rarity: 'rare', small: true, blurb: 'Fires a stream of bullets.' },
  ray: { name: 'Ray Ball', rarity: 'rare', blurb: 'Shines a burning ray.' },
  electroking: { name: 'Electro King', rarity: 'rare', blurb: 'Rules the storm.' },
  virus: { name: 'Virus Ball', rarity: 'rare', blurb: 'Infects enemies, worse with every hit.' },
  range: { name: 'Range Ball', rarity: 'rare', blurb: 'Hits from far away.' },
  snake: { name: 'Snake Ball', rarity: 'rare', blurb: 'Its tail bites anyone who crosses it.' },
  acid: { name: 'Acid Ball', rarity: 'rare', blurb: 'Leaves pools of acid.' },
  hook: { name: 'Hook Ball', rarity: 'rare', blurb: 'Hooks enemies and drags them in.' },
};

export const EXPLOSIONS = {
  lightwing_volley: { name: 'Lightwing Volley', rarity: 'mythic', blurb: 'A storm of violet blades.' },
  hell_shackles: { name: 'Hell Shackles', rarity: 'mythic', blurb: 'Chains of hellfire. Warning!' },
  magic_cube: { name: 'Magic Cube', rarity: 'legendary', blurb: 'A cube of pure magic.' },
  twin_blades: { name: 'Yellow and Blue Twin Blades', rarity: 'legendary', blurb: 'Two blades cross in a flash.' },
  starcross: { name: 'Starcross', rarity: 'epic', blurb: 'A star that cuts the sky.' },
  devour: { name: 'Devour', rarity: 'epic', blurb: 'Swallows everything around it.' },
  digital_bombardment: { name: 'Digital Bombardment', rarity: 'epic', blurb: 'A rain of glowing pixels.' },
  flower_blizzard: { name: 'Flower Blizzard', rarity: 'epic', blurb: 'A whirl of glowing petals.' },
  voltstrike: { name: 'Voltstrike', rarity: 'rare', blurb: 'A ball of crackling volts.' },
  azure_lightning: { name: 'Azure Lightning', rarity: 'rare', blurb: 'Blue lightning in a sphere.' },
  purple_toxic_gas: { name: 'Purple Toxic Gas', rarity: 'rare', blurb: 'A deadly purple cloud.' },
  green_toxic_gas: { name: 'Green Toxic Gas', rarity: 'rare', blurb: 'A cloud of toxic green.' },
  thornbeam_amber: { name: 'Thornbeam Amber', rarity: 'rare', blurb: 'Sharp amber rays.' },
  thornbeam_violet: { name: 'Thornbeam Violet', rarity: 'rare', blurb: 'Sharp violet rays.' },
  green_smoke: { name: 'Green Smoke', rarity: 'uncommon', blurb: 'A puff of green smoke.' },
  blue_smoke: { name: 'Blue Smoke', rarity: 'uncommon', blurb: 'A puff of blue smoke.' },
  grey_smoke: { name: 'Grey Smoke', rarity: 'uncommon', blurb: 'A puff of grey smoke.' },
  yellow_smoke: { name: 'Yellow Smoke', rarity: 'uncommon', blurb: 'A puff of yellow smoke.' },
  pink_stardust: { name: 'Pink Stardust', rarity: 'uncommon', blurb: 'Sparkling pink dust.' },
  golden_stardust: { name: 'Golden Stardust', rarity: 'uncommon', blurb: 'Sparkling gold dust.' },
  flash_sky_blue: { name: 'Flash Sky blue', rarity: 'uncommon', blurb: 'A sky blue flash.' },
  flash_soft_pink: { name: 'Flash Soft Pink', rarity: 'uncommon', blurb: 'A soft pink flash.' },
};

export const FLYERS = {
  lightwing_wings: { name: 'Lightwing', rarity: 'mythic', blurb: 'Crystal wings of light.' },
  shackles_motorcycle: { name: 'Shackles Motorcycle', rarity: 'mythic', blurb: 'Rides on wheels of fire.' },
  hovering_ufo: { name: 'Hovering UFO', rarity: 'legendary', blurb: 'Out of this world.' },
  hot_dog_jetpack: { name: 'Hot Dog Jetpack', rarity: 'legendary', blurb: 'Powered by ketchup and mustard.' },
  tech_eye: { name: 'Tech Eye', rarity: 'legendary', blurb: 'It sees everything.' },
  careful_bomb: { name: 'Careful Bomb', rarity: 'epic', blurb: 'Handle with care.' },
  rocket: { name: 'Rocket', rarity: 'epic', blurb: 'Three, two, one...' },
  spacecraft: { name: 'Spacecraft', rarity: 'epic', blurb: 'Ready for lift-off.' },
  strawberry_donut: { name: 'Strawberry Donut', rarity: 'epic', blurb: 'Sweet and sprinkled.' },
  piloted_ufo: { name: 'Piloted UFO', rarity: 'epic', blurb: 'Someone is driving it.' },
  magic_broom: { name: 'Magic Broom', rarity: 'epic', blurb: 'Sweeps through the sky.' },
  sixty_seven: { name: '67', rarity: 'rare', blurb: 'Ride the number.' },
  park_bench: { name: 'Park Bench', rarity: 'rare', blurb: 'Take a seat in the sky.' },
  trophy: { name: 'Trophy', rarity: 'rare', blurb: 'For champions only.' },
  vacation_chair: { name: 'Vacation Chair', rarity: 'rare', blurb: 'Fly while you relax.' },
  colorful_balloon: { name: 'Colorful Balloon', rarity: 'rare', blurb: 'Up, up and away.' },
  rainbow_popsicle: { name: 'Rainbow Popsicle', rarity: 'rare', blurb: 'A cool ride.' },
  wooden_barrel: { name: 'Wooden Barrel', rarity: 'rare', blurb: 'Roll out.' },
  red_buddy: { name: 'Red Buddy', rarity: 'rare', blurb: 'A friendly red pal.' },
  cyan_park_bench: { name: 'Cyan Park Bench', rarity: 'rare', blurb: 'A bench in teal.' },
  leaf_surfboard: { name: 'Leaf Surfboard', rarity: 'rare', blurb: 'Surf the wind.' },
  coffee_cup: { name: 'Coffee Cup', rarity: 'uncommon', blurb: 'Wake up and fly.' },
  bed: { name: 'Bed', rarity: 'uncommon', blurb: 'Sleep on the way.' },
  wooden_chair: { name: 'Wooden Chair', rarity: 'uncommon', blurb: 'Simple and sturdy.' },
  paper_airplane: { name: 'Paper Airplane', rarity: 'uncommon', blurb: 'Folded for flight.' },
  rubber_duck: { name: 'Rubber Duck', rarity: 'uncommon', blurb: 'Squeak squeak.' },
};

/** Each kind of thing: its list, and the profile key that counts what a player owns of it. */
export const KINDS = {
  ball: { items: CATALOG, key: 'balls' },
  explosion: { items: EXPLOSIONS, key: 'explosions' },
  flyer: { items: FLYERS, key: 'flyers' },
};

const byRarity = (items) => Object.keys(items).sort(
  (a, b) => RARITY_ORDER.indexOf(items[a].rarity) - RARITY_ORDER.indexOf(items[b].rarity),
);

/** Catalog keys by rarity (mythic first), then catalog order. */
export const CATALOG_ORDER = byRarity(CATALOG);
export const ORDER = { ball: CATALOG_ORDER, explosion: byRarity(EXPLOSIONS), flyer: byRarity(FLYERS) };
