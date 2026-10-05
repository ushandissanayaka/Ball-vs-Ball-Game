import * as THREE from 'three';
import { fetchArenas } from '../../net/api.js';
import { createSmokeBurst } from '../../effects/duelFx.js';
import { createFightView } from '../../objects/duel/fightView.js';
import { createHeartsSprite } from '../../objects/duel/heartsSprite.js';
import { SIM } from '../../shared/duelSim.js';
import { createStrike } from './strike.js';
import { createLegionCharacter, disposeCharacter } from '../../objects/player/LegionCharacter.js';
import { createHeadshot, idle } from '../headshot.js';

const POLL_MS = 2000;
const LIVE_POLL_MS = 1000; // a duel is on somewhere: keep closer track of it
const OPEN_PHASES = new Set(['choose', 'aim', 'fight', 'over']);
const HEART_LIFT = new THREE.Vector3(0, 1.9, 0);
const OFFLINE_POLL_MS = 10_000; // the server is asleep or unreachable: ask less often
const FORGET_SELF_MS = 4000; // after leaving an arena, an answer sent before the server knew may still list us
const SIDE_NAMES = ['pink', 'blue'];

const occupantKey = (occupant) => `${occupant.name}|${occupant.avatar?.skinUrl ?? ''}|${occupant.avatar?.equipped?.skinId ?? ''}`;

/**
 * Other players on the duel arenas, as everyone in the lobby sees them: asks the server every couple of seconds
 * who stands where, and for each player on an arena stands their character on their square, raises the box and
 * puts their picture and name on its screen (the arena the player is in themselves is the duel director's).
 * Their duel plays out for every onlooker too: the countdown on the screen, the chosen balls lined up in the box,
 * the fight itself (replayed from its setup in step with the server's clock, so it is the same fight the players
 * see), hearts over their heads, and the winning ball flying onto the loser's head.
 * Nothing here runs per frame but a cheap check: characters are made only when someone arrives, stand still (so
 * the lobby still draws only when something changes), and their pictures are rendered straight into textures
 * (never read back from the GPU).
 *   start(), dispose()
 *   update(dt, t)   call each frame (t in seconds); true when the world changed and needs drawing
 *   left(arenaId)   the player just left that arena (so a stale answer doesn't show their own character there)
 */
export function createArenaWatch({ scene, renderer, camera, arenas, seatArenaId, myName }) {
  const smoke = createSmokeBurst(scene);
  let clockOffset = 0; // the server's clock minus ours
  let anyLive = false;
  const watched = new Map(); // arenaId -> { occupants, sides: { pink, blue }, applied }
  let timer = 0;
  let stopped = false;
  let dirty = false;
  let lastSeat = null;
  let forgetSelf = { arenaId: null, until: 0 };

  const entryOf = (arenaId) => {
    if (!watched.has(arenaId)) {
      watched.set(arenaId, {
        occupants: null, sides: { pink: null, blue: null }, applied: '', live: false, launchAt: 0,
        duel: null, fightView: null, strike: null, hearts: null, count: null,
      });
    }
    return watched.get(arenaId);
  };

  function removeSpectator(entry, side) {
    const spectator = entry.sides[side];
    if (!spectator) return;
    spectator.gone = true;
    disposeCharacter(spectator.character);
    spectator.headshot.dispose();
    entry.sides[side] = null;
    entry.applied = '';
    dirty = true;
  }

  function addSpectator(arenaId, entry, side, occupant) {
    const arena = arenas.get(arenaId);
    const character = createLegionCharacter(occupant.avatar ?? {});
    character.group.rotation.y = arena.spotPose(side, character.group.position);
    scene.add(character.group);
    const spectator = { key: occupantKey(occupant), name: occupant.name, character, headshot: null, texture: null, gone: false };
    spectator.headshot = createHeadshot(renderer, scene, character, { hud: false });
    entry.sides[side] = spectator;
    entry.applied = '';
    dirty = true;
    // The picture is taken a moment after the character first appears, so the two don't land in one frame.
    character.ready.then(idle).then(() => {
      if (spectator.gone) return;
      character.update(0, 0);
      character.group.updateMatrixWorld(true);
      spectator.headshot.capture();
      spectator.texture = spectator.headshot.texture;
      entry.applied = '';
      dirty = true;
    });
  }

  /** Brings one arena's characters and screen in line with who the server says stands there. */
  function sync(arenaId, entry) {
    const arena = arenas.get(arenaId);
    const mine = seatArenaId() === arenaId;
    for (const side of SIDE_NAMES) {
      let occupant = mine ? null : entry.occupants?.[side] ?? null;
      if (occupant && forgetSelf.arenaId === arenaId && performance.now() < forgetSelf.until && occupant.name === myName()) occupant = null;
      const spectator = entry.sides[side];
      if (spectator && (!occupant || spectator.key !== occupantKey(occupant))) removeSpectator(entry, side);
      if (occupant && !entry.sides[side]) addSpectator(arenaId, entry, side, occupant);
    }
    if (mine) {
      entry.live = false;
      return; // the duel director draws this arena's screen
    }
    // Their duel is on: the squares fly up into the spotlights, the box grows, the players stand beside it (at
    // `launchAt`, the moment the players' own screens do it: see `update`).
    const live = Boolean(entry.occupants?.live);
    if (live !== entry.live) {
      entry.live = live;
      if (!live) {
        arena.setExpanded(false);
        arena.resetBeams();
        dirty = true;
      }
    }
    const shown = Object.fromEntries(SIDE_NAMES.map((side) => [side, entry.sides[side] ? (entry.sides[side].texture ?? true) : false]));
    const names = Object.fromEntries(SIDE_NAMES.map((side) => [side, entry.sides[side]?.name ?? null]));
    const key = SIDE_NAMES.map((side) => `${Boolean(shown[side])}:${Boolean(shown[side]?.isTexture)}:${names[side]}`).join('|');
    if (key === entry.applied) return;
    entry.applied = key;
    arena.setOccupants(shown, names);
    dirty = true;
  }

  async function poll() {
    if (stopped) return;
    const answer = document.hidden ? null : await fetchArenas();
    if (stopped) return;
    const list = answer?.arenas ?? null;
    if (list) {
      const now = performance.now();
      clockOffset = answer.serverTime - Date.now();
      anyLive = list.some((state) => state.occupants?.live);
      for (const state of list) {
        const arena = arenas.get(state.id);
        if (!arena) continue;
        arena.setPlayers(state.players, state.capacity, state.reward);
        const entry = entryOf(state.id);
        entry.occupants = state.occupants ?? null;
        entry.duel = state.occupants?.duel ?? null;
        // The server's launch time on our clock (already past once the countdown is over).
        entry.launchAt = now + Math.max(0, (state.occupants?.launchAt ?? 0) - answer.serverTime);
        sync(state.id, entry);
      }
    }
    timer = setTimeout(poll, !list && !document.hidden ? OFFLINE_POLL_MS : anyLive ? LIVE_POLL_MS : POLL_MS);
  }

  /** Stops showing an arena's duel: empties the box, hides the hearts, rolls the screen back down. */
  function endWatch(entry, arena) {
    if (!entry.fightView) return;
    entry.fightView.clear();
    entry.strike.end();
    for (const hearts of Object.values(entry.hearts)) hearts.group.visible = false;
    arena.setScreenOpen(false);
    arena.setCountdown(null);
    entry.count = null;
    dirty = true;
  }

  /** Plays one watched arena's duel at server time `serverNow`. True while something in it moves. */
  function stageDuel(arenaId, entry, arena, dt, time, serverNow) {
    const { duel } = entry;
    if (!duel || seatArenaId() === arenaId) {
      endWatch(entry, arena);
      return false;
    }
    if (!entry.fightView) {
      entry.fightView = createFightView(arena, { audible: false });
      entry.strike = createStrike({ scene, camera, smoke });
      entry.hearts = { pink: createHeartsSprite(), blue: createHeartsSprite() };
      for (const hearts of Object.values(entry.hearts)) scene.add(hearts.group);
    }
    const { phase, fight } = duel;
    const roundKey = `${duel.id}:${duel.round}`;
    // The VS screen counts down, then rolls up to open the box.
    if (phase === 'intro') {
      const left = duel.phaseEndsAt - serverNow;
      const count = left > 1000 ? Math.min(3, Math.ceil((left - 1000) / 1000)) : null;
      if (count !== entry.count) {
        entry.count = count;
        arena.setCountdown(count);
      }
    } else if (entry.count !== null) {
      entry.count = null;
      arena.setCountdown(null);
    }
    arena.setScreenOpen(OPEN_PHASES.has(phase));
    const view = entry.fightView;
    if (phase === 'aim') {
      view.lineup({ pink: duel.players.pink.ball, blue: duel.players.blue.ball }, null);
      view.showArrow(false);
    } else if (phase === 'fight' && fight) {
      view.start(fight);
      view.advanceTo(Math.max(0, Math.min(fight.ticks, Math.floor((serverNow - fight.startsAt) / (1000 / SIM.tickRate)))));
      entry.strike.stage(serverNow, fight, roundKey, view, entry.sides[fight.loser]?.character, { audible: false });
    } else {
      view.clear();
      entry.strike.end();
    }
    view.update(dt, time);
    // Hearts over both players' heads (the loser's last one goes when the ball lands on them).
    for (const side of SIDE_NAMES) {
      const hearts = entry.hearts[side];
      const spectator = entry.sides[side];
      hearts.group.visible = Boolean(spectator);
      if (!spectator) continue;
      let count = duel.players[side].hearts;
      if (phase === 'fight' && fight?.loser === side && !entry.strike.impacted(roundKey)) count += 1;
      hearts.setCount(count);
      spectator.character.headPosition(hearts.group.position).add(HEART_LIFT);
      hearts.update(dt);
    }
    return phase !== 'done';
  }

  const update = (dt = 0, time = 0) => {
    const now = performance.now();
    const serverNow = Date.now() + clockOffset;
    for (const [arenaId, entry] of watched) {
      if (stageDuel(arenaId, entry, arenas.get(arenaId), dt, time, serverNow)) dirty = true;
    }
    for (const [arenaId, entry] of watched) {
      const arena = arenas.get(arenaId);
      if (entry.live && now >= entry.launchAt && seatArenaId() !== arenaId) {
        arena.launchBeams(); // no-ops once launched
        arena.setExpanded(true);
      }
      // Players follow their places while a box grows or shrinks.
      if (!arena.expanding()) continue;
      for (const side of SIDE_NAMES) {
        const spectator = entry.sides[side];
        if (spectator) spectator.character.group.rotation.y = arena.spotPose(side, spectator.character.group.position);
      }
      dirty = true;
    }
    const seat = seatArenaId();
    if (seat !== lastSeat) {
      // Taking a seat: that arena is the director's now. Leaving one: show who else is there again.
      for (const id of [seat, lastSeat]) {
        if (!id || !watched.has(id)) continue;
        const entry = watched.get(id);
        entry.applied = '';
        sync(id, entry);
      }
      lastSeat = seat;
    }
    const changed = dirty;
    dirty = false;
    return changed;
  };

  const left = (arenaId) => { forgetSelf = { arenaId, until: performance.now() + FORGET_SELF_MS }; };

  const start = () => { poll(); };
  const dispose = () => {
    stopped = true;
    clearTimeout(timer);
    for (const [arenaId, entry] of watched) {
      endWatch(entry, arenas.get(arenaId));
      for (const side of SIDE_NAMES) removeSpectator(entry, side);
    }
  };

  return { start, update, left, dispose };
}
