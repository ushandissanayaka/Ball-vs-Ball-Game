import * as THREE from 'three';
import { ARENA_BASE, ARENA_ROWS, ARENA_X, FLOOR_Y, MASCOTS, PROPS } from '../config/layout.js';
import { NeonBuilder } from '../effects/neon.js';
import { createHub } from '../objects/platform/HubPlatform.js';
import { createRunway } from '../objects/platform/Runway.js';
import { createSupportBlocks } from '../objects/platform/SupportBlocks.js';
import { createLeaderboard } from '../objects/props/Leaderboard.js';
import { createPortal2v2 } from '../objects/props/Portal2v2.js';
import { createHexPedestal, createInfoPedestal } from '../objects/props/Pedestals.js';
import { createFlyersDisplay } from '../objects/props/FlyersDisplay.js';
import { createExplosionsProjector } from '../objects/props/ExplosionsProjector.js';
import { createBallsMachine } from '../objects/props/BallsMachine.js';
import { createLimitedShop } from '../objects/props/LimitedShop.js';
import { createDuelArena } from '../objects/props/DuelArena.js';
import { createMascots } from '../objects/props/Mascots.js';
import { place } from '../util/mesh.js';
import { batchStatic } from '../util/staticBatch.js';
import { formatDayHour, nextLimitedOfferEnd, nextWeeklyReset } from '../shared/constants.js';
import { SEED_LEADERBOARDS } from '../shared/lobbySeed.js';
import { createWalkArea } from './walkArea.js';

const weeklyTitle = (resetsAt, now) => `Weekly Top Spenders (${formatDayHour(resetsAt - now)})`;

/**
 * Builds the lobby: hub, neck and runway decks, every station on them, the arenas and the mascots. Returns the
 * root group and `apply(lobby, now)`, which pushes server data (leaderboards, countdowns, arena players) into it.
 */
export function buildLobby() {
  const root = new THREE.Group();
  root.name = 'lobby';
  const neon = new NeonBuilder();
  root.add(createHub(neon), createRunway(neon), createSupportBlocks());

  const now = Date.now();
  const allTime = createLeaderboard({ title: 'Top Spenders', rows: SEED_LEADERBOARDS.allTime });
  const weekly = createLeaderboard({ title: weeklyTitle(nextWeeklyReset(now), now), rows: SEED_LEADERBOARDS.weekly });
  root.add(place(allTime.group, PROPS.leaderboardAllTime.position, FLOOR_Y, PROPS.leaderboardAllTime.rotation));
  root.add(place(weekly.group, PROPS.leaderboardWeekly.position, FLOOR_Y, PROPS.leaderboardWeekly.rotation));
  for (const spot of PROPS.pedestals) root.add(place(createHexPedestal(), spot, FLOOR_Y));

  const stations = [
    [createPortal2v2(), PROPS.portal2v2],
    [createFlyersDisplay(), PROPS.flyers],
    [createExplosionsProjector(), PROPS.explosions],
    [createBallsMachine(), PROPS.balls],
    [createInfoPedestal(), PROPS.infoPedestal],
  ];
  for (const [group, { position, rotation }] of stations) root.add(place(group, position, FLOOR_Y, rotation));

  const shop = createLimitedShop();
  root.add(place(shop.group, PROPS.limitedShop.position, FLOOR_Y, PROPS.limitedShop.rotation));

  // What the player character walks round: each station as a few circles over its footprint.
  const walkArea = createWalkArea();
  for (const board of [allTime.group, weekly.group]) for (const x of [-16, -6, 6, 16]) walkArea.addObstacle(board, 5, [x, 0]);
  for (const spot of root.children.filter((child) => child.name === 'hex-pedestal')) walkArea.addObstacle(spot, 5);
  const [portal, flyers, explosions, balls, info] = stations.map(([group]) => group);
  walkArea.addObstacle(portal, 8.5);
  walkArea.addObstacle(flyers, 7.5);
  walkArea.addObstacle(explosions, 7);
  for (const x of [-6.5, 6.5]) walkArea.addObstacle(balls, 7, [x, 0]);
  walkArea.addObstacle(info, 4.5);
  for (const x of [-5.5, 5.5]) walkArea.addObstacle(shop.group, 7.5, [x, 0]);
  shop.setEndsIn(formatDayHour(nextLimitedOfferEnd(now) - now));
  // Room round the shop's show (bike, smoke column, chain spike), for the "is it on screen?" check.
  shop.group.updateMatrixWorld(true);
  const animatedBounds = new THREE.Sphere(shop.group.localToWorld(new THREE.Vector3(-2, 9, 0)), 20);

  // Arenas: W1..W5 on the west deck, E1..E5 on the east, north to south.
  const arenas = new Map();
  ARENA_ROWS.forEach((z, row) => {
    for (const [side, x, turn] of [['W', -ARENA_X, Math.PI], ['E', ARENA_X, 0]]) {
      const arena = createDuelArena();
      root.add(place(arena.group, [x, z], FLOOR_Y, turn));
      arenas.set(`${side}${row + 1}`, arena);
      walkArea.addStep(arena.group, ARENA_BASE[0] / 2, ARENA_BASE[1] / 2, 1.2);
    }
  });

  // Mascots with a `perch` sit on a prop: resolve the perch point (in that prop's own space) to a position.
  const perchProps = { leaderboardAllTime: allTime.group, leaderboardWeekly: weekly.group };
  const mascots = Object.fromEntries(Object.entries(MASCOTS).map(([name, mascot]) => {
    if (!mascot.perch) return [name, mascot];
    const prop = perchProps[mascot.perch.on];
    prop.updateMatrixWorld(true);
    const [x, y] = mascot.perch.at;
    const point = prop.localToWorld(new THREE.Vector3(x, y + mascot.radius * mascot.stretch[1] * 0.92, 0));
    return [name, { ...mascot, position: point.toArray() }];
  }));
  root.add(createMascots(mascots));
  batchStatic(root);
  root.add(neon.build());

  let lobby = null;
  /** Pushes the latest lobby data (or just refreshes the countdowns when `next` is null). */
  const apply = (next, time = Date.now()) => {
    if (next) {
      lobby = next;
      allTime.update({ rows: next.leaderboards.allTime });
      for (const state of next.arenas) arenas.get(state.id)?.setPlayers(state.players, state.capacity, state.reward);
    }
    const weeklyResetsAt = lobby?.leaderboards.weeklyResetsAt ?? nextWeeklyReset(time);
    weekly.update({ title: weeklyTitle(weeklyResetsAt, time), rows: lobby?.leaderboards.weekly });
    shop.setEndsIn(formatDayHour((lobby?.limitedOffer.endsAt ?? nextLimitedOfferEnd(time)) - time));
  };
  /** Moves the limited shop's show to `seconds`. */
  const animate = (seconds) => shop.update(seconds);
  /** Moves the arenas' VS boards; true while any is still moving. */
  const updateArenas = (dt) => {
    let moving = false;
    for (const arena of arenas.values()) moving = arena.update(dt) || moving;
    return moving;
  };
  return { root, apply, animate, animatedBounds, arenas, walkArea, updateArenas };
}
