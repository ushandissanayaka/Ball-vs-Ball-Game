import * as THREE from 'three';
import { CAMERA } from '../config/layout.js';
import { QUALITY } from '../config/graphics.js';
import { SKY } from '../config/palette.js';
import { createCameraControls } from '../controls/cameraControls.js';
import { createBloomComposer } from '../effects/postprocessing.js';
import { createClouds } from '../objects/environment/Clouds.js';
import { createSea } from '../objects/environment/Sea.js';
import { bakeSkyReflections, createSky } from '../objects/environment/Sky.js';
import { buildLobby } from './buildLobby.js';
import { createLighting, setShadowResolution } from './lighting.js';

const COUNTDOWN_REFRESH_MS = 30_000;

/**
 * The 3D lobby on `canvas`. Only the sea moves, so while the camera is still the picture is redrawn just often
 * enough for the water (the quality's waterFps); camera moves, new data and resizes draw at once. That keeps
 * phones cool and batteries full.
 */
export function createLobbyWorld(canvas, { quality = 'High' } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
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

  const sky = createSky();
  const sea = createSea();
  scene.add(sky, createClouds(), sea, createLighting());
  const lobby = buildLobby();
  scene.add(lobby.root);
  scene.environment = bakeSkyReflections(renderer, scene, [sea, lobby.root]);

  // Debug: ?cam=x,y,z,targetX,targetY,targetZ opens on a chosen view (handy for screenshots).
  const cam = new URLSearchParams(window.location.search).get('cam')?.split(',').map(Number);
  const controls = createCameraControls(camera, canvas, cam?.length === 6 && cam.every(Number.isFinite) ? cam : null);
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
  const loop = (time) => {
    frame = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (time - last) / 1000);
    last = time;
    if (controls.update(dt)) needsRender = true;
    const waterDue = settings.waterFps > 0 && time - lastDraw >= 1000 / settings.waterFps - 2;
    if (!needsRender && !waterDue) return;
    needsRender = false;
    lastDraw = time;
    if (settings.waterFps > 0) sea.userData.update(time / 1000);
    if (settings.bloom && composer) composer.render(dt);
    else renderer.render(scene, camera);
  };

  const observer = new ResizeObserver(resize);
  let countdownTimer = 0;
  const start = () => {
    observer.observe(canvas);
    setQuality(quality);
    countdownTimer = setInterval(() => { lobby.apply(null); requestRender(); }, COUNTDOWN_REFRESH_MS);
    frame = requestAnimationFrame(loop);
  };

  const applyLobby = (data) => {
    lobby.apply(data);
    requestRender();
  };

  const dispose = () => {
    cancelAnimationFrame(frame);
    clearInterval(countdownTimer);
    observer.disconnect();
    controls.dispose();
    composer?.dispose();
    renderer.dispose();
  };

  return { start, applyLobby, setQuality, dispose };
}
