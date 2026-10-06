import * as THREE from 'three';
import { CAMERA, SPAWN } from '../config/layout.js';
import { attachChatBubble, chatBubbleSeconds, chatBubbleText, getAvatarSpec, getPlayerName, playerInRoom, playerJoined } from '../bloxity/sdk.js';
import { readMove, startPlayerInput, stopPlayerInput, takeJump } from '../controls/playerInput.js';
import { conveyorPush } from '../objects/platform/Runway.js';
import { CHARACTER_HEIGHT, createLegionCharacter } from '../objects/player/LegionCharacter.js';
import { createDuelDirector } from './duel/duelDirector.js';
import { createDuelWarmup, warmUpRenderer } from './duel/duelWarmup.js';
import { createArenaWatch } from './duel/arenaWatch.js';
import { createHeadshot } from './headshot.js';
import { NAME_LIFT, createRemotePlayers } from './remotePlayers.js';
import { createStickerBubbles, warmStickers } from './stickers.js';
import { idle } from './headshot.js';
import { stickerSound } from '../audio/sfx.js';
import { connectPresence } from '../net/presence.js';
import { QUALITY } from '../config/graphics.js';
import { SKY } from '../config/palette.js';
import { createCameraControls } from '../controls/cameraControls.js';
import { createBloomComposer } from '../effects/postprocessing.js';
import { createClouds } from '../objects/environment/Clouds.js';
import { createBallThumbs } from './ballThumbs.js';
import { footstepSound, jumpSound, landSound } from '../audio/sfx.js';
import { createSea } from '../objects/environment/Sea.js';
import { bakeSkyReflections, createSky } from '../objects/environment/Sky.js';
import { buildLobby } from './buildLobby.js';
import { createLighting, setShadowResolution } from './lighting.js';

const COUNTDOWN_REFRESH_MS = 30_000;
const WALK_SPEED = 26; // world units per second
const CHARACTER_RADIUS = 1.3;
const EYE_HEIGHT = 4.2; // the camera orbits this far above the character's feet
// A jump: up at `speed`, pulled back by `gravity` (about 4 units high, 0.7 s in the air).
const JUMP = { speed: 24, gravity: 70 };
// Chat bubbles: their size, and how high they float (over the head; over the name tag on other players).
const BUBBLE_SCALE = 2.2;
const BUBBLE_OVER_HEAD = CHARACTER_HEIGHT + 1.8;
const BUBBLE_OVER_NAME = CHARACTER_HEIGHT + NAME_LIFT + 2.6;

/**
 * The 3D lobby on `canvas`. Only the sea moves, so while the camera is still the picture is redrawn just often
 * enough for the water (the quality's waterFps); camera moves, new data and resizes draw at once. That keeps
 * phones cool and batteries full.
 */
export function createLobbyWorld(canvas, {
  quality = 'High', onDuelChange = () => {}, onProfile = () => {}, allowedBalls = () => null, onPicture = () => {},
} = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Checking every shader for errors after compiling makes the browser wait for it to finish (a stall each time a
  // new one appears): they are known good.
  renderer.debug.checkShaderErrors = false;
  // Debug: ?perf exposes the renderer and scene, for measuring draw calls and shaders.
  if (new URLSearchParams(window.location.search).has('perf')) window.__bvb = { renderer, scene: null };
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY.haze);
  scene.fog = new THREE.Fog(SKY.haze, 900, 4300);
  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 1, 14000);
  camera.position.set(...CAMERA.position);

  if (window.__bvb) window.__bvb.scene = scene;
  const sky = createSky();
  const sea = createSea();
  scene.add(sky, createClouds(), sea, createLighting());
  const lobby = buildLobby();
  scene.add(lobby.root);
  scene.environment = bakeSkyReflections(renderer, scene, [sea, lobby.root]);

  // The player's Legion character, spawned in the middle of the hub.
  const character = createLegionCharacter(getAvatarSpec());
  // Debug: ?spawn=x,z starts the character somewhere else (e.g. on an arena square, for screenshots).
  const spawnParam = new URLSearchParams(window.location.search).get('spawn')?.split(',').map(Number);
  const spawn = spawnParam?.length === 2 && spawnParam.every(Number.isFinite) ? spawnParam : SPAWN.position;
  const placeAtSpawn = () => {
    character.group.position.set(spawn[0], lobby.walkArea.groundAt(...spawn), spawn[1]);
    character.group.rotation.y = SPAWN.facing;
  };
  placeAtSpawn();
  scene.add(character.group);
  const headshot = createHeadshot(renderer, scene, character);
  /** The character's face for the HUD's profile (an ImageBitmap to `onPicture`), taken again when the avatar changes. */
  const sharePicture = () => headshot.toImage().then(onPicture, () => {});
  character.ready.then(() => {
    character.update(0, 0);
    headshot.capture();
    sharePicture();
    needsRender = true;
  });

  // Debug: ?cam=x,y,z,targetX,targetY,targetZ opens on a chosen view (handy for screenshots).
  const cam = new URLSearchParams(window.location.search).get('cam')?.split(',').map(Number);
  // Debug: ?show=seconds freezes the limited shop's show at that moment of its loop (for screenshots).
  const showParam = Number.parseFloat(new URLSearchParams(window.location.search).get('show'));
  const frozenShow = Number.isFinite(showParam) ? showParam : null;
  const controls = createCameraControls(camera, canvas, cam?.length === 6 && cam.every(Number.isFinite) ? cam : null);
  const duel = createDuelDirector({
    scene, camera, canvas, renderer, arenas: lobby.arenas, character, headshot, controls, onChange: onDuelChange, onProfile,
    onLeave: (arenaId) => watch.left(arenaId), allowedBalls,
  });
  // Everyone else on the arenas: their characters on the squares, their pictures and names on the screens.
  const watch = createArenaWatch({
    scene, renderer, camera, arenas: lobby.arenas, seatArenaId: () => duel.seatArenaId, myName: getPlayerName,
  });
  // Everyone else walking about the lobby, live (nobody to see when playing offline against the bot).
  const others = createRemotePlayers(scene, camera);
  const stickers = createStickerBubbles(scene);
  // Someone else's sticker: over their head, with its sound (quieter than one's own).
  others.onSticker = (id, index) => {
    stickers.show(id, index, (target) => others.headOf(id, target));
    stickerSound(index, false);
  };
  /** The player's own sticker: over their head at once, and to everyone else. */
  const sendSticker = (index) => {
    stickers.show('me', index, (target) => character.headPosition(target));
    stickerSound(index, true);
    presence?.sendSticker(index);
    needsRender = true;
  };
  let presence = null;
  const offline = new URLSearchParams(window.location.search).has('bot');

  // ---- Bloxity: chat over heads, respawns, avatar changes ----
  let bubblesUntil = 0; // the frame keeps being drawn while a chat bubble shows or fades
  let chatOn = true;
  /**
   * A chat message (from the Bloxity SDK) over its sender's head: one's own over one's character, anyone else's
   * just above their name tag. Players not in this room are skipped.
   */
  const showChat = (message) => {
    if (!chatOn) return;
    const sender = message.isLocalPlayer ? character : others.characterOf(message);
    if (!sender) return;
    const seconds = chatBubbleSeconds();
    const bubble = attachChatBubble(THREE, sender.group, chatBubbleText(message), {
      height: message.isLocalPlayer ? BUBBLE_OVER_HEAD : BUBBLE_OVER_NAME, scale: BUBBLE_SCALE, seconds,
    });
    if (bubble) bubblesUntil = Math.max(bubblesUntil, performance.now() + seconds * 1000 + 100);
    requestRender();
  };
  const setChatEnabled = (on) => { chatOn = on; };
  /** Back to the spawn point (the portal's Respawn), off any duel square first. */
  const respawn = () => {
    if (duel.seated) duel.actions.leave();
    airborne = false;
    rise = 0;
    placeAtSpawn();
    controls.follow(eye.copy(character.group.position).setY(character.group.position.y + EYE_HEIGHT));
    requestRender();
  };
  /** The player changed their avatar or signed in or out: dress the character anew and tell everyone else. */
  const refreshPlayer = () => {
    character.setAvatar(getAvatarSpec()).then(() => {
      headshot.capture();
      sharePicture();
      requestRender();
    });
    presence?.restart();
  };
  let settings = QUALITY[quality] ?? QUALITY.High;
  let composer = null;
  let needsRender = true;
  const requestRender = () => { needsRender = true; };

  const resize = () => {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, settings.pixelRatio));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (settings.bloom) {
      composer ??= createBloomComposer(renderer, scene, camera);
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(width, height);
    }
    requestRender();
  };

  const setQuality = (name) => {
    settings = QUALITY[name] ?? settings;
    scene.traverse((object) => {
      if (object.isDirectionalLight) object.castShadow = settings.shadows;
    });
    setShadowResolution(scene, settings.shadowSize);
    renderer.shadowMap.needsUpdate = true;
    resize();
  };

  let frame = 0;
  let last = performance.now();
  let lastDraw = 0;
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const step = new THREE.Vector3();
  const eye = new THREE.Vector3();
  let rise = 0; // upward speed while in the air (a jump)
  let airborne = false;
  /** Walks the character from the input (riding the conveyors, jumping); true while it moves. */
  const moveCharacter = (dt) => {
    // On a duel square the character stands still (the duel uses the same keys to aim).
    const input = duel.seated ? { x: 0, y: 0 } : readMove();
    const jump = takeJump() && !duel.seated;
    const speed = Math.min(1, Math.hypot(input.x, input.y));
    const position = character.group.position;
    if (speed > 0.01) {
      camera.getWorldDirection(forward).setY(0).normalize();
      right.crossVectors(forward, camera.up).normalize();
      step.set(0, 0, 0).addScaledVector(right, input.x).addScaledVector(forward, input.y).multiplyScalar(WALK_SPEED * dt);
      lobby.walkArea.move(position, step.x, step.z, CHARACTER_RADIUS);
      // Turn smoothly to face the way it walks (the model faces +Z).
      const want = Math.atan2(step.x, step.z);
      const diff = Math.atan2(Math.sin(want - character.group.rotation.y), Math.cos(want - character.group.rotation.y));
      character.group.rotation.y += diff * Math.min(1, dt * 12);
    }
    // Standing on a conveyor strip carries the character the way its arrows point (in the air it doesn't, so a
    // jump takes it off the strip).
    const push = airborne || duel.seated ? 0 : conveyorPush(position.x, position.z);
    if (push) lobby.walkArea.move(position, 0, push * dt, CHARACTER_RADIUS);
    if (jump && !airborne) {
      airborne = true;
      rise = JUMP.speed;
      jumpSound();
    }
    const ground = lobby.walkArea.groundAt(position.x, position.z);
    if (airborne && !duel.seated) {
      rise -= JUMP.gravity * dt;
      position.y += rise * dt;
      if (position.y <= ground) {
        position.y = ground;
        airborne = false;
        landSound();
      }
    } else {
      airborne = false;
      // Step up onto (and down off) the arena bases smoothly.
      position.y += (ground - position.y) * Math.min(1, dt * 14);
    }
    const settling = Math.abs(ground - position.y) > 0.01;
    const walk = duel.seated ? duel.seatWalk : speed;
    // Where this character stands, for everyone else (flags: 1 in the air, 2 on a duel square).
    presence?.setPose([position.x, position.y, position.z, character.group.rotation.y, walk, (airborne ? 1 : 0) | (duel.seated ? 2 : 0)]);
    // Footsteps keep time with the legs, so they quicken as the walk speeds up.
    if (character.update(dt, walk) && !airborne) footstepSound(walk);
    controls.follow(eye.copy(position).setY(position.y + EYE_HEIGHT));
    return speed > 0.01 || settling || airborne || push !== 0;
  };
  const frustum = new THREE.Frustum();
  const viewProjection = new THREE.Matrix4();
  const draw = (dt = 0) => {
    if (settings.bloom && composer) composer.render(dt);
    else renderer.render(scene, camera);
  };
  const loop = (time) => {
    frame = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (time - last) / 1000);
    last = time;
    if (moveCharacter(dt)) needsRender = true;
    if (lobby.updateArenas(dt)) needsRender = true;
    if (duel.update(dt, time / 1000)) needsRender = true;
    if (watch.update(dt, time / 1000)) needsRender = true;
    if (others.update(dt)) needsRender = true;
    if (stickers.update(dt)) needsRender = true;
    if (time < bubblesUntil) needsRender = true;
    if (controls.update(dt)) needsRender = true;
    const waterDue = settings.waterFps > 0 && time - lastDraw >= 1000 / settings.waterFps - 2;
    // The shop's show and the conveyors play at animFps, but only while on screen; off screen they cost nothing.
    camera.updateMatrixWorld();
    viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(viewProjection);
    const onScreen = lobby.animatedBounds.some((bounds) => (bounds.isBox3 ? frustum.intersectsBox(bounds) : frustum.intersectsSphere(bounds)));
    const showDue = onScreen && time - lastDraw >= 1000 / settings.animFps - 2;
    if (!needsRender && !waterDue && !showDue) return;
    needsRender = false;
    lastDraw = time;
    if (settings.waterFps > 0) sea.userData.update(time / 1000);
    lobby.animate(frozenShow ?? time / 1000);
    draw(dt);
  };

  const observer = new ResizeObserver(resize);
  let countdownTimer = 0;
  /**
   * `room`: the presence room to join ('lobby', or a Bloxity party's own); `onWelcome(room)` once in it.
   */
  const start = ({ room = 'lobby', onWelcome = () => {} } = {}) => {
    observer.observe(canvas);
    startPlayerInput();
    duel.start();
    setQuality(quality);
    // Get every shader, texture and mesh the duel will use onto the GPU now, behind the loading screen, not
    // the first time each one is drawn mid-duel.
    const warmup = createDuelWarmup();
    scene.add(warmup);
    warmUpRenderer(renderer, scene, camera, draw);
    warmup.visible = false;
    watch.start();
    idle().then(() => warmStickers(renderer));
    if (!offline) {
      presence = connectPresence({
        name: getPlayerName,
        avatar: getAvatarSpec,
        room: () => room,
      }, {
        onWelcome: (_id, joinedRoom) => onWelcome(joinedRoom),
        // Bloxity toasts a friend arriving in the room, or already in it when the player arrives.
        onJoin: (list, existing) => {
          others.onJoin(list);
          for (const { name } of list) (existing ? playerInRoom : playerJoined)(name);
        },
        onLeave: others.onLeave,
        onState: others.onState,
        onSticker: (id, index) => others.onSticker(id, index),
        onReset: others.onReset,
      });
    }
    countdownTimer = setInterval(() => { lobby.apply(null); requestRender(); }, COUNTDOWN_REFRESH_MS);
    frame = requestAnimationFrame(loop);
  };

  const applyLobby = (data) => {
    lobby.apply(data);
    requestRender();
  };

  /** Renders each ball of `kinds` to a picture for the HUD, one at a time between frames: onEach(kind, url). */
  let thumbs = null;
  const renderBallThumbs = async (kinds, onEach) => {
    thumbs ??= createBallThumbs(renderer, scene.environment);
    for (const kind of kinds) {
      if (!thumbs) return; // disposed meanwhile
      onEach(kind, await thumbs.render(kind));
    }
  };

  const dispose = () => {
    thumbs?.dispose();
    thumbs = null;
    cancelAnimationFrame(frame);
    stopPlayerInput();
    duel.dispose();
    watch.dispose();
    presence?.dispose();
    others.onReset();
    clearInterval(countdownTimer);
    observer.disconnect();
    controls.dispose();
    composer?.dispose();
    renderer.dispose();
  };

  return {
    start, applyLobby, setQuality, renderBallThumbs, sendSticker, duel: duel.actions, dispose,
    showChat, setChatEnabled, respawn, refreshPlayer, setCameraSensitivity: controls.setSensitivity,
  };
}
