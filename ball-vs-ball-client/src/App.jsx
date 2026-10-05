import React, { useEffect, useMemo, useRef, useState } from 'react';
import { applyAllSettings, gameplayStart, listenSetting, loadingEnd, startBloxity } from './bloxity/sdk.js';
import { defaultQuality, QUALITY } from './config/graphics.js';
import { buyItem, claimDaily, claimGems, fetchLobby, fuse, openCrate, offlineLobby, offlineProfile, openSession } from './net/api.js';
import { createLobbyWorld } from './scene/createLobbyWorld.js';
import { fontsReady } from './util/canvasText.js';
import { hideLoadingScreen, nextFrame, showLoadingStep } from './ui/screens/loadingScreen.js';
import LobbyScreen from './ui/screens/LobbyScreen.jsx';
import { setBallThumb } from './ui/thumbs.js';
import { startAudioNow, unlockAudioOnFirstInput } from './audio/engine.js';
import { loadSamples } from './audio/samples.js';
import { startMusic } from './audio/music.js';
import { coinSound } from './audio/sfx.js';
import { BALL_IDS } from './shared/balls.js';

const LOBBY_REFRESH_MS = 30_000;
const STARTUP_LIMIT_MS = 45_000;

export default function App() {
  const canvasRef = useRef(null);
  const [lobby, setLobby] = useState(offlineLobby);
  const [profile, setProfile] = useState(offlineProfile);
  // The duel HUD: the Join prompt in the lobby, the duel itself once on a square (see scene/duel/duelDirector.js).
  const [duel, setDuel] = useState({ prompt: null, note: null, duel: null });
  const worldRef = useRef(null);
  const duelActions = useMemo(() => ({
    join: () => worldRef.current?.duel.join(),
    leave: () => worldRef.current?.duel.leave(),
    choose: (ball) => worldRef.current?.duel.choose(ball),
    reroll: () => worldRef.current?.duel.reroll(),
    lockAim: () => worldRef.current?.duel.lockAim(),
  }), []);
  const sendSticker = useMemo(() => (index) => worldRef.current?.sendSticker(index), []);
  // Daily rewards, store purchases, crates and Daily Diamonds: each resolves to { profile, ... } (now shown) or { error }.
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const shopActions = useMemo(() => {
    const apply = async (pending) => {
      const result = await pending;
      if (result.profile) {
        setProfile(result.profile);
        if (!result.prizes) coinSound();
      }
      return result;
    };
    return {
      claimDaily: (day) => apply(claimDaily(day, profileRef.current)),
      buy: (item) => apply(buyItem(item, profileRef.current)),
      openCrate: (crate, count) => apply(openCrate(crate, count, profileRef.current)),
      claimGems: () => apply(claimGems(profileRef.current)),
      fuse: (kind, id, mode) => apply(fuse(kind, id, mode, profileRef.current)),
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let world = null;
    let refreshTimer = 0;
    let stopQualitySetting = () => {};

    // Whatever happens while starting (an error, a page nobody can see), the game is never left behind the
    // loading screen: a failed start still lets the player in, and after STARTUP_LIMIT_MS it opens regardless.
    let opened = false;
    const open = async () => {
      if (opened || disposed) return;
      opened = true;
      clearTimeout(failsafe);
      await hideLoadingScreen();
      loadingEnd();
      gameplayStart();
    };
    const failsafe = setTimeout(() => {
      console.warn('Ball vs Ball: still starting after', STARTUP_LIMIT_MS, 'ms; opening the game anyway');
      open();
    }, STARTUP_LIMIT_MS);

    (async () => {
      startBloxity();
      unlockAudioOnFirstInput();
      showLoadingStep('Loading fonts', 0.15);
      await fontsReady();
      if (disposed) return;

      showLoadingStep('Building the arena', 0.35);
      // Let the screen paint before the (synchronous) world build (never waiting long: see nextFrame).
      await nextFrame();
      world = createLobbyWorld(canvasRef.current, { quality: defaultQuality(), onDuelChange: setDuel, onProfile: setProfile });
      worldRef.current = world;

      showLoadingStep('Connecting', 0.75);
      const [lobbyResult, session] = await Promise.all([fetchLobby(), openSession()]);
      if (disposed) return;
      setLobby(lobbyResult.lobby);
      setProfile(session.profile);
      world.applyLobby(lobbyResult.lobby);
      world.start();
      // The portal's graphics setting (registering it also shows the control in the portal menu).
      stopQualitySetting = listenSetting('graphics_quality', (value) => {
        if (QUALITY[value]) world.setQuality(value);
      });
      applyAllSettings();

      refreshTimer = setInterval(async () => {
        const { lobby: next, online } = await fetchLobby();
        if (disposed || !online) return;
        setLobby(next);
        world.applyLobby(next);
      }, LOBBY_REFRESH_MS);

      await open();
      if (disposed) return;
      startAudioNow();
      startMusic();
      loadSamples();
      // The HUD's ball pictures, from the 3D balls (the drawn icons stand in until each is ready).
      world.renderBallThumbs(BALL_IDS, setBallThumb);
    })().catch((error) => {
      console.error('Ball vs Ball could not finish starting:', error);
      open();
    });

    return () => {
      clearTimeout(failsafe);
      disposed = true;
      clearInterval(refreshTimer);
      stopQualitySetting();
      world?.dispose();
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="world" tabIndex={0} />
      <LobbyScreen lobby={lobby} profile={profile} duel={duel} duelActions={duelActions} shopActions={shopActions} onSticker={sendSticker} />
    </>
  );
}
