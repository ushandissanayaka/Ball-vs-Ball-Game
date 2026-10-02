import * as THREE from 'three';
import { ARENA_MODES, ARENA_ROWS, ARENA_X, FLOOR_Y, MASCOTS, PROPS } from '../config/layout.js';
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
  shop.setEndsIn(formatDayHour(nextLimitedOfferEnd(now) - now));

  // Arenas: W1..W5 on the west deck, E1..E5 on the east, north to south.
  const arenas = new Map();
  ARENA_ROWS.forEach((z, row) => {
    for (const [side, x, turn] of [['W', -ARENA_X, Math.PI], ['E', ARENA_X, 0]]) {
      const arena = createDuelArena({ row, mode: ARENA_MODES[side][row] });
      root.add(place(arena.group, [x, z], FLOOR_Y, turn));
      arenas.set(`${side}${row + 1}`, arena);
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
  return { root, apply };
}
