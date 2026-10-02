import React, { useEffect, useRef, useState } from 'react';
import { applyAllSettings, gameplayStart, listenSetting, loadingEnd, startBloxity } from './bloxity/sdk.js';
import { defaultQuality, QUALITY } from './config/graphics.js';
import { fetchLobby, offlineLobby, offlineProfile, openSession } from './net/api.js';
import { createLobbyWorld } from './scene/createLobbyWorld.js';
import { fontsReady } from './util/canvasText.js';
import { hideLoadingScreen, showLoadingStep } from './ui/screens/loadingScreen.js';
import LobbyScreen from './ui/screens/LobbyScreen.jsx';

const LOBBY_REFRESH_MS = 30_000;

export default function App() {
  const canvasRef = useRef(null);
  const [lobby, setLobby] = useState(offlineLobby);
  const [profile, setProfile] = useState(offlineProfile);

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
      world = createLobbyWorld(canvasRef.current, { quality: defaultQuality() });

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

      hideLoadingScreen();
      loadingEnd();
      gameplayStart();
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
      <LobbyScreen lobby={lobby} profile={profile} />
    </>
  );
}
