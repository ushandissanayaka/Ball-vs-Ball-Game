import * as THREE from 'three';
import { getAvatarSpec, getPlayerName } from '../../bloxity/sdk.js';
import { ARENA_BASE } from '../../config/layout.js';
import { readMove } from '../../controls/playerInput.js';
import { createSmokeBurst } from '../../effects/duelFx.js';
import { arenaState, duelAim, duelChoose, duelReroll, joinArena, leaveArena } from '../../net/api.js';
import { createFightView } from '../../objects/duel/fightView.js';
import { ballsAppearSound, countdownSound, popupSound, resultSound } from '../../audio/sfx.js';
import { createStrike } from './strike.js';
import { setMusicMood } from '../../audio/music.js';
import { createHeartsSprite } from '../../objects/duel/heartsSprite.js';
import { createLegionCharacter, disposeCharacter } from '../../objects/player/LegionCharacter.js';
import { SIDES } from '../../objects/props/DuelArena.js';
import { DUEL } from '../../shared/constants.js';
import { DUEL_TIMING, otherSide } from '../../shared/duelMatch.js';
import { SIM, START } from '../../shared/duelSim.js';
import { createHeadshot } from '../headshot.js';
import { createLocalDuel } from './localDuel.js';

const POLL_MS = 500;
const MS_PER_TICK = 1000 / SIM.tickRate;
// The camera turns toward the loser as the ball flies, holds on the hit, and turns back (ms after the fight ends).
const PAN = { in: 900, full: 1800, hold: 3600, out: 4300 };
const OPEN_PHASES = new Set(['choose', 'aim', 'fight', 'over']);
const HEART_LIFT = new THREE.Vector3(0, 1.9, 0); // hearts float this far over a duelling player's head
const PROMPT_LIFT = 3.2; // the Join prompt floats this far over the character's head
const FORCE_BOT = new URLSearchParams(window.location.search).has('bot');

const remoteHost = {
  local: false,
  state: arenaState,
  choose: duelChoose,
  aim: duelAim,
  reroll: duelReroll,
  leave: leaveArena,
};

const smooth = (t) => t * t * (3 - 2 * t);
/** `from` turned toward `to` by `t` (radians, the short way round). */
const turnToward = (from, to, t) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * t;
const easeOutBack = (x) => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2;

/**
 * The 1v1 duel, from the player's side. In the lobby it watches for the character standing on an arena square
 * and offers "E Join" there; joining stands the character on the square facing the lane, turns the camera onto
 * the duel box, and follows the duel (the game server's, polled; or a local one against a bot when the server
 * can't be reached, or with ?bot=1), staging each phase in the world:
 *   waiting  the box rises behind the player with their picture on its VS screen
 *   intro    the opponent appears on the other square; 3, 2, 1 on the screen; the spotlights shoot up
 *   choose   the VS screen rolls up, opening the box (the HUD shows the ball cards)
 *   aim      both balls in the box; the player drags (or uses A/D) to turn their dashed arrow
 *   fight    the balls fight; then the winning ball flies out of the box at the loser's head, black smoke
 *            bursts round them and a heart pops off
 *   over     the result; then both step off their squares
 * `onChange(hud)` tells the HUD what to show (see `hudState`); `onProfile(profile)` passes on coin and gem
 * changes. `update(dt, seconds)` runs it all each frame and returns true while it needs drawing.
 */
export function createDuelDirector({ scene, camera, canvas, renderer, arenas, character, headshot, controls, onChange, onProfile, onLeave = () => {}, allowedBalls = () => null }) {
  const smoke = createSmokeBurst(scene);
  const fightViews = new Map();
  const fightViewOf = (arenaId, arena) => {
    if (!fightViews.has(arenaId)) fightViews.set(arenaId, createFightView(arena));
    return fightViews.get(arenaId);
  };
  const myHearts = createHeartsSprite();
  myHearts.group.visible = false;
  scene.add(myHearts.group);

  let seat = null; // { arenaId, spot, arena, host, fightView, name }
  let view = null; // the duel as the host last described it, or null while waiting
  let clockOffset = 0; // server clock minus ours
  let clockSynced = false;
  let pollTimer = 0;
  let prompt = null; // { arenaId, spot, arena } the square the character stands on, while not seated
  let promptScreen = null;
  let note = null; // { text, until }
  let myPicture = null;
  let opponent = null; // { key, side, character, headshot, texture, picture, hearts, appear }
  let roundKey = null;
  let chosen = null; // the ball picked this round (before the host confirms it)
  let aimLocked = false;
  let aim = { x: 1, y: 0 };
  const strike = createStrike({ scene, camera, smoke });
  let lastHudKey = '';
  let seatWalk = 0; // the player's walk cycle while stepping out beside the grown box (0 standing)
  let occupantsKey = '';

  const serverNow = () => Date.now() + clockOffset;
  const flashNote = (text) => { note = { text, until: performance.now() + 2600 }; };

  // ---- Lobby: the "E Join" prompt --------------------------------------------------------------------
  // It shows anywhere on a duel arena's stage, over the character's head (so it is always on screen), and joins
  // the square the character stands on, or else the nearer one (the server hands over the other if it's taken).
  const anchor = new THREE.Vector3();
  const updatePrompt = () => {
    prompt = null;
    const position = character.group.position;
    for (const [arenaId, arena] of arenas) {
      // A full arena (two players waiting or duelling there) has no square to join.
      if (!arena.onStage(position) || arena.isFull()) continue;
      prompt = { arenaId, spot: arena.spotAt(position) ?? arena.nearestSpot(position), arena };
      break;
    }
    promptScreen = null;
    if (!prompt) return;
    character.headPosition(anchor);
    anchor.y += PROMPT_LIFT;
    anchor.project(camera);
    if (anchor.z > 1) return;
    promptScreen = {
      x: Math.round(((anchor.x + 1) / 2) * canvas.clientWidth),
      y: Math.round(((1 - anchor.y) / 2) * canvas.clientHeight),
    };
  };

  // ---- Joining and leaving ---------------------------------------------------------------------------
  const avatarForServer = () => {
    const spec = getAvatarSpec();
    return { skinUrl: spec.skinUrl, skinId: spec.equipped?.skinId };
  };

  /** My picture for the board (a texture, straight away) and the HUD (a bitmap, read back without a stall). */
  function takeMyPicture(mySeat) {
    myPicture = null;
    headshot.capture();
    headshot.toImage().then((picture) => { if (seat === mySeat) myPicture = picture; });
  }

  async function join(arenaId, spot) {
    if (seat) return;
    const arena = arenas.get(arenaId);
    if (!arena) return;
    const mySeat = { arenaId, spot, arena, host: null, fightView: fightViewOf(arenaId, arena), name: getPlayerName() };
    seat = mySeat;
    prompt = null;
    promptScreen = null;
    // Stand on the square, facing the lane, and take the picture for the board.
    character.group.rotation.y = arena.spotPose(spot, character.group.position);
    character.update(0, 0);
    takeMyPicture(mySeat);
    arena.setLabelVisible(false);
    occupantsKey = '';
    clockSynced = false;
    pushHud(true);

    // The server works out the balls this player may use itself; a bot duel uses these.
    const player = { name: mySeat.name, avatar: avatarForServer(), allowed: allowedBalls() };
    let host = null;
    if (FORCE_BOT) host = createLocalDuel({ spot, player });
    else {
      const t0 = Date.now();
      const result = await joinArena(arenaId, spot, player);
      if (seat !== mySeat) {
        // Left before the server answered.
        if (result.ok && result.online) leaveArena();
        return;
      }
      if (!result.ok) {
        release({ tellServer: false });
        flashNote('Someone is duelling here');
        return;
      }
      // The square asked for was taken: the server gave this player the other one.
      if (result.online && result.spot && result.spot !== spot) {
        mySeat.spot = result.spot;
        character.group.rotation.y = arena.spotPose(result.spot, character.group.position);
        character.update(0, 0);
        takeMyPicture(mySeat);
      }
      host = result.online ? remoteHost : createLocalDuel({ spot, player });
      if (result.online) applyState({ serverTime: result.serverTime, seated: true, arena: result.arena, duel: result.duel }, t0, Date.now());
    }
    mySeat.host = host;
    poll();
  }

  async function poll() {
    const mySeat = seat;
    if (!mySeat?.host) return;
    const t0 = Date.now();
    const result = await mySeat.host.state();
    if (seat !== mySeat) return;
    if (result) applyState(result, t0, Date.now());
    if (seat === mySeat) pollTimer = setTimeout(poll, POLL_MS);
  }

  function applyState(result, t0, t1) {
    const estimate = result.serverTime - (t0 + t1) / 2;
    clockOffset = clockSynced ? clockOffset + (estimate - clockOffset) * 0.25 : estimate;
    clockSynced = true;
    if (result.profile) onProfile(result.profile);
    if (!result.seated) {
      release({ tellServer: false });
      return;
    }
    setView(result.duel ?? null);
  }

  function setView(next) {
    view = next;
    if (!view) {
      removeOpponent();
      roundKey = null;
      return;
    }
    const key = `${view.id}:${view.round}`;
    if (key !== roundKey) {
      roundKey = key;
      chosen = null;
      aimLocked = false;
      aim = { x: view.you === 'pink' ? 1 : -1, y: 0 };
    }
    ensureOpponent();
  }

  function release({ tellServer }) {
    if (!seat) return;
    const { arena, arenaId, host, spot, fightView } = seat;
    clearTimeout(pollTimer);
    seat = null;
    view = null;
    roundKey = null;
    lastPhase = null;
    setMusicMood('lobby');
    if (tellServer && host) host.leave().then((left) => { if (left) arena.setPlayers(left.players, left.capacity, left.reward); });
    fightView.clear();
    endFlight();
    arena.setOccupants({});
    arena.setCountdown(null);
    arena.setScreenOpen(false);
    arena.resetBeams();
    arena.setLabelVisible(true);
    removeOpponent();
    myHearts.group.visible = false;
    arena.setExpanded(false);
    seatWalk = 0;
    // Step off the square, toward the lane, and hand the camera back.
    const off = arena.group.localToWorld(new THREE.Vector3(-ARENA_BASE[0] / 2 - 3, 0, SIDES[spot].z));
    character.group.position.x = off.x;
    character.group.position.z = off.z;
    controls.clearCinematic(character.group.position.clone().setY(character.group.position.y + 4.2));
    pushHud(true);
    onLeave(arenaId);
  }

  // ---- The opponent's character ------------------------------------------------------------------------
  function ensureOpponent() {
    const side = otherSide(view.you);
    if (opponent?.key === view.id) return;
    removeOpponent();
    const info = view.players[side];
    const body = createLegionCharacter(info.avatar ?? {});
    body.group.rotation.y = seat.arena.spotPose(side, body.group.position);
    body.group.scale.setScalar(0.001);
    scene.add(body.group);
    const hearts = createHeartsSprite();
    scene.add(hearts.group);
    const mine = { key: view.id, side, character: body, headshot: createHeadshot(renderer, scene, body), texture: null, picture: null, hearts, appear: 0 };
    opponent = mine;
    occupantsKey = '';
    body.ready.then(() => {
      if (opponent !== mine) return;
      body.update(0, 0);
      const scale = body.group.scale.x;
      body.group.scale.setScalar(1); // the picture is taken at full size
      body.group.updateMatrixWorld(true);
      mine.headshot.capture();
      body.group.scale.setScalar(scale);
      mine.texture = mine.headshot.texture;
      occupantsKey = '';
      mine.headshot.toImage().then((picture) => { if (opponent === mine) mine.picture = picture; });
    });
  }

  function removeOpponent() {
    if (!opponent) return;
    disposeCharacter(opponent.character);
    opponent.headshot.dispose();
    opponent.hearts.group.removeFromParent();
    opponent = null;
    occupantsKey = '';
  }

  // ---- Aiming --------------------------------------------------------------------------------------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let aiming = null; // pointer id of the drag that aims
  const canAim = () => seat && view?.phase === 'aim' && !aimLocked && !view.players[view.you].locked;
  const aimAt = (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = seat.arena.pickSim(raycaster.ray);
    if (!hit) return;
    const [sx, sy] = START[view.you];
    const dx = hit.x - sx;
    const dy = hit.y - sy;
    const length = Math.hypot(dx, dy);
    if (length > 3) aim = { x: dx / length, y: dy / length };
  };
  const onPointerDown = (event) => {
    if (!canAim()) return;
    aiming = event.pointerId;
    aimAt(event);
  };
  const onPointerMove = (event) => { if (aiming === event.pointerId && canAim()) aimAt(event); };
  const onPointerUp = (event) => { if (aiming === event.pointerId) aiming = null; };
  const onKeyDown = (event) => {
    if (event.code !== 'KeyE' || event.repeat || event.target.closest?.('input, textarea')) return;
    if (!seat && prompt) join(prompt.arenaId, prompt.spot);
  };

  // ---- Staging each phase ------------------------------------------------------------------------------
  const head = new THREE.Vector3();
  const characterOf = (side) => (side === seat.spot ? character : opponent?.character);
  const heartsOf = (side) => {
    if (!view) return DUEL_TIMING.hearts;
    let hearts = view.players[side].hearts;
    // The loser's heart goes when the ball lands, not when the server worked out the fight.
    if (view.phase === 'fight' && view.fight.loser === side && !strike.impacted(roundKey)) hearts += 1;
    return hearts;
  };

  function endFlight() {
    strike.end();
  }

  function stageStrike(now, fight) {
    strike.stage(now, fight, roundKey, seat.fightView, characterOf(fight.loser));
  }

  const camPosition = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  function stageCamera(now) {
    let toward = null;
    let amount = 0;
    if (view?.phase === 'fight') {
      const since = now - view.fight.endsAt;
      toward = view.fight.loser;
      if (since >= PAN.in && since < PAN.out) {
        amount = since < PAN.full ? smooth((since - PAN.in) / (PAN.full - PAN.in)) : since < PAN.hold ? 1 : 1 - smooth((since - PAN.hold) / (PAN.out - PAN.hold));
      }
    }
    seat.arena.framing(camera.fov, camera.aspect, camPosition, camTarget, toward, amount);
    controls.setCinematic(camPosition, camTarget);
  }

  // Once both are in (as the spotlights shoot up), the box grows and both players walk out to stand beside it.
  const walkFrom = new THREE.Vector3();
  const walkTo = new THREE.Vector3();
  function placePlayers() {
    const { arena, spot } = seat;
    const walking = arena.expanding();
    seatWalk = walking ? 1 : 0;
    for (const [side, body] of [[spot, character], [otherSide(spot), opponent?.character]]) {
      if (!body) continue;
      const yaw = arena.spotPose(side, body.group.position);
      if (!walking) {
        body.group.rotation.y = yaw;
        continue;
      }
      // Face the way they walk, then turn back to the lane as they arrive.
      arena.spotPose(side, walkFrom, 0);
      arena.spotPose(side, walkTo, 1);
      const away = Math.atan2(walkTo.x - walkFrom.x, walkTo.z - walkFrom.z);
      body.group.rotation.y = turnToward(yaw, away, Math.min(1, Math.sin(Math.PI * arena.expansion()) * 1.8));
    }
  }

  // Sounds as the duel moves on: the ball choice opening, the balls popping into the box, the result. The music
  // picks up while the player is in a duel.
  let lastPhase = null;
  let lastCount = null;
  function soundPhase(phase, current) {
    setMusicMood(seat ? 'duel' : 'lobby');
    if (phase === lastPhase) return;
    const was = lastPhase;
    lastPhase = phase;
    if (was === null) return; // joined mid-duel: no catching-up sounds
    if (phase === 'choose') popupSound();
    else if (phase === 'aim') ballsAppearSound();
    else if (phase === 'over' && current) resultSound(current.winner === seat.spot);
    if (phase !== 'intro') lastCount = null;
  }

  function stage(dt, time) {
    const now = serverNow();
    const { arena, fightView, spot } = seat;
    const phase = view?.phase ?? 'waiting';

    const opponentName = opponent ? view?.players[opponent.side].name ?? null : null;
    const key = `${Boolean(opponent)}:${Boolean(opponent?.texture)}:${opponentName}`;
    if (key !== occupantsKey) {
      occupantsKey = key;
      arena.setOccupants(
        { [spot]: headshot.texture, [otherSide(spot)]: opponent ? (opponent.texture ?? true) : false },
        { [spot]: seat.name, [otherSide(spot)]: opponentName },
      );
    }

    soundPhase(phase, view);
    let launched = OPEN_PHASES.has(phase);
    if (phase === 'intro') {
      const left = view.phaseEndsAt - now;
      const count = left > 1000 ? Math.min(3, Math.ceil((left - 1000) / 1000)) : 0;
      if (count !== lastCount) {
        lastCount = count;
        countdownSound(count);
      }
      arena.setCountdown(count || null);
      launched = left < 1000;
    } else {
      arena.setCountdown(null);
    }
    if (launched) arena.launchBeams();
    else if (!view) arena.resetBeams();
    arena.setExpanded(launched);
    placePlayers();
    arena.setScreenOpen(OPEN_PHASES.has(phase));

    if (phase === 'aim') {
      fightView.lineup({ pink: view.players.pink.ball, blue: view.players.blue.ball }, view.you);
      if (canAim()) {
        const turn = readMove().x;
        if (Math.abs(turn) > 0.05) {
          const angle = Math.atan2(aim.y, aim.x) - turn * 2.4 * dt;
          aim = { x: Math.cos(angle), y: Math.sin(angle) };
        }
      }
      fightView.setAim(aim);
      fightView.showArrow(true);
    } else if (phase === 'fight') {
      const { fight } = view;
      fightView.start(fight);
      fightView.advanceTo(Math.max(0, Math.min(fight.ticks, Math.floor((now - fight.startsAt) / MS_PER_TICK))));
      stageStrike(now, fight);
    } else {
      fightView.clear();
      if (strike.flying) endFlight();
    }
    fightView.update(dt, time);

    // Characters: the opponent pops in; both stand idle; hearts float over their heads.
    const duelOn = Boolean(view);
    myHearts.group.visible = duelOn;
    if (duelOn) {
      myHearts.setCount(heartsOf(spot));
      character.headPosition(head);
      myHearts.group.position.copy(head).add(HEART_LIFT);
      myHearts.update(dt);
    }
    if (opponent) {
      opponent.appear = Math.min(1, opponent.appear + dt / 0.45);
      opponent.character.group.scale.setScalar(Math.max(0.001, easeOutBack(opponent.appear)));
      opponent.character.update(dt, seatWalk);
      opponent.hearts.setCount(heartsOf(opponent.side));
      opponent.character.headPosition(head);
      opponent.hearts.group.position.copy(head).add(HEART_LIFT);
      opponent.hearts.update(dt);
    }
    stageCamera(now);
  }

  // ---- The HUD ---------------------------------------------------------------------------------------
  function hudState() {
    const now = serverNow();
    const noteText = note && performance.now() < note.until ? note.text : null;
    if (!seat) return { prompt: promptScreen, note: noteText, duel: null };
    const me = seat.spot;
    const phase = view?.phase ?? 'waiting';
    const pictures = { [me]: myPicture, [otherSide(me)]: opponent?.picture ?? null };
    const playerOf = (side) => {
      if (!view) return side === me ? { name: seat.name, hearts: DUEL_TIMING.hearts, ball: null, picture: myPicture } : null;
      const p = view.players[side];
      const ball = side === me ? p.ball ?? chosen : p.ball;
      return { name: p.name, hearts: heartsOf(side), ball, chosen: p.chosen || (side === me && Boolean(chosen)), locked: p.locked, picture: pictures[side] };
    };
    const timed = phase === 'choose' || phase === 'aim';
    const fight = view?.fight;
    return {
      prompt: null,
      note: noteText,
      duel: {
        phase,
        you: me,
        local: Boolean(seat.host?.local),
        secondsLeft: timed ? Math.max(0, Math.ceil((view.phaseEndsAt - now) / 1000)) : null,
        players: { pink: playerOf('pink'), blue: playerOf('blue') },
        offers: view?.players[me].offers ?? [],
        allowed: view?.players[me].allowed ?? null,
        chosen: view?.players[me].ball ?? chosen,
        locked: aimLocked || Boolean(view?.players[me].locked),
        fightBanner: Boolean(fight) && now > fight.startsAt - 700 && now < fight.startsAt + 650,
        result: phase === 'over' ? { won: view.winner === me, reward: DUEL.winReward, endedBy: view.endedBy } : null,
        rerollCost: DUEL_TIMING.rerollCost,
      },
    };
  }

  function pushHud(force = false) {
    const hud = hudState();
    // Pictures are long data URLs: compare whether they are there, not the URLs themselves.
    const key = JSON.stringify(hud, (k, v) => (k === 'picture' ? Boolean(v) : v));
    if (!force && key === lastHudKey) return;
    lastHudKey = key;
    onChange(hud);
  }

  // ---- Actions from the HUD ------------------------------------------------------------------------------
  const answer = (result) => {
    if (result?.profile) onProfile(result.profile);
    if (result?.duel && seat) setView(result.duel);
    return result;
  };

  const actions = {
    join: () => { if (!seat && prompt) join(prompt.arenaId, prompt.spot); },
    leave: () => release({ tellServer: true }),
    choose: (ball) => {
      if (!seat?.host || view?.phase !== 'choose') return;
      chosen = ball;
      seat.host.choose(ball).then(answer);
    },
    reroll: () => {
      if (!seat?.host || view?.phase !== 'choose') return;
      seat.host.reroll().then((result) => {
        answer(result);
        if (result?.error) flashNote(seat?.host?.local ? 'Rerolls need the game server' : 'Not enough gems');
      });
    },
    lockAim: () => {
      if (!canAim()) return;
      aimLocked = true;
      seat.host.aim(aim.x, aim.y).then(answer);
    },
  };

  // ---- Every frame -------------------------------------------------------------------------------------
  const update = (dt, time) => {
    let active = false;
    if (seat) {
      stage(dt, time);
      active = true;
    } else {
      updatePrompt();
    }
    if (smoke.update(dt)) active = true;
    pushHud();
    return active;
  };

  const start = () => {
    window.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const dispose = () => {
    if (seat) release({ tellServer: true });
    window.removeEventListener('keydown', onKeyDown);
    canvas.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
  };

  return { start, update, dispose, actions, get seated() { return Boolean(seat); }, get seatArenaId() { return seat?.arenaId ?? null; }, get seatWalk() { return seatWalk; } };
}
