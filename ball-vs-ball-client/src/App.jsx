import React, { useEffect, useMemo, useRef, useState } from 'react';
import { applyAllSettings, gameplayStart, listenSetting, loadingEnd, startBloxity } from './bloxity/sdk.js';
import { defaultQuality, QUALITY } from './config/graphics.js';
import { buyItem, claimDaily, claimGems, fetchLobby, fuse, openCrate, offlineLobby, offlineProfile, openSession } from './net/api.js';
import { createLobbyWorld } from './scene/createLobbyWorld.js';
import { fontsReady } from './util/canvasText.js';
import { hideLoadingScreen, showLoadingStep } from './ui/screens/loadingScreen.js';
import LobbyScreen from './ui/screens/LobbyScreen.jsx';
import { setBallThumb } from './ui/thumbs.js';
import { BALL_IDS } from './shared/balls.js';

const LOBBY_REFRESH_MS = 30_000;

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
  // Daily rewards, store purchases, crates and Daily Diamonds: each resolves to { profile, ... } (now shown) or { error }.
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const shopActions = useMemo(() => {
    const apply = async (pending) => {
      const result = await pending;
      if (result.profile) setProfile(result.profile);
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

    (async () => {
      startBloxity();
      showLoadingStep('Loading fonts', 0.15);
      await fontsReady();
      if (disposed) return;

      showLoadingStep('Building the arena', 0.35);
      // Let the bar paint before the (synchronous) world build.
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve)));
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

      await hideLoadingScreen();
      if (disposed) return;
      loadingEnd();
      gameplayStart();
      // The HUD's ball pictures, from the 3D balls (the drawn icons stand in until each is ready).
      world.renderBallThumbs(BALL_IDS, setBallThumb);
    })();

    return () => {
      disposed = true;
      clearInterval(refreshTimer);
      stopQualitySetting();
      world?.dispose();
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="world" tabIndex={0} />
      <LobbyScreen lobby={lobby} profile={profile} duel={duel} duelActions={duelActions} shopActions={shopActions} />
    </>
  );
}
