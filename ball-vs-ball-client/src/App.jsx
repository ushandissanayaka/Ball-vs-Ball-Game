import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  applyAllSettings, buyWithGems, exitFullscreen, gameplayEnd, gameplayStart, getGemsBalance, getPartyLaunch, listenSetting,
  loadingEnd, onAvatarChanged, onChatMessage, onPlayerEvent, onUserChanged, partyFailed, partyJoined, requestFullscreen, startBloxity, updateRoom,
} from './bloxity/sdk.js';
import { defaultQuality, QUALITY } from './config/graphics.js';
import { buyItem, claimDaily, claimGems, confirmPurchase, fetchLobby, fuse, openCrate, offlineLobby, offlineProfile, openSession } from './net/api.js';
import { createLobbyWorld } from './scene/createLobbyWorld.js';
import { fontsReady } from './util/canvasText.js';
import { hideLoadingScreen, nextFrame, showLoadingStep } from './ui/screens/loadingScreen.js';
import LobbyScreen from './ui/screens/LobbyScreen.jsx';
import { BuyContext } from './ui/hooks/buyContext.js';
import { useBloxityUser } from './ui/hooks/useBloxity.js';
import { showFps } from './ui/fpsCounter.js';
import { setBallThumb } from './ui/thumbs.js';
import { allowedBalls } from './shared/levels.js';
import { setMasterVolume, setMusicVolume, startAudioNow, unlockAudioOnFirstInput } from './audio/engine.js';
import { loadSamples } from './audio/samples.js';
import { startMusic } from './audio/music.js';
import { coinSound } from './audio/sfx.js';
import { BALL_IDS } from './shared/balls.js';

const LOBBY_REFRESH_MS = 30_000;
const STARTUP_LIMIT_MS = 45_000;
// A party not seated in its room by then is reported as failed (the server may be waking up, which takes a while).
const PARTY_SEAT_LIMIT_MS = 90_000;
const ROOM_ID = /^party-[A-Za-z0-9_-]{1,64}$/;

/**
 * The presence room to play in: a Bloxity party's own (every member gets the same one from the party's room key,
 * and nobody else can find it), one named by an invite link (?roomId=), or the open lobby.
 */
function chooseRoom(party) {
  if (party && !party.managed && party.roomKey) return `party-${String(party.roomKey).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64)}`;
  const linked = new URLSearchParams(window.location.search).get('roomId');
  return linked && ROOM_ID.test(linked) ? linked : 'lobby';
}

export default function App() {
  const canvasRef = useRef(null);
  const [lobby, setLobby] = useState(offlineLobby);
  const [profile, setProfile] = useState(offlineProfile);
  const user = useBloxityUser();
  const [gemsBalance, setGemsBalance] = useState(null);
  const [picture, setPicture] = useState(null); // the player's Legion character's face (an ImageBitmap)
  const refreshGems = useMemo(() => () => getGemsBalance().then(setGemsBalance), []);
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
  /**
   * Buys Gems product `item.id` (a sku) through Bloxity, then waits for the server to grant it (Bloxity tells
   * the server by webhook). A gift goes to `item.giftTo.id`. Resolves to { done, gift?, pending? } or { error }.
   */
  const buyProduct = useMemo(() => async (item) => {
    const result = await buyWithGems(item.id, item.giftTo ? { giftTo: item.giftTo.id } : undefined);
    if (!result?.success) return { error: result?.error ?? 'failed' };
    refreshGems();
    if (item.giftTo) return { done: true, gift: true };
    const granted = await confirmPurchase(item.id, result.transactionId, profileRef.current);
    if (granted.profile) {
      setProfile(granted.profile);
      coinSound();
    }
    return { done: true, pending: Boolean(granted.pending) };
  }, [refreshGems]);

  useEffect(() => {
    let disposed = false;
    let world = null;
    let refreshTimer = 0;
    let partyTimer = 0;
    const stops = [];

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
      world = createLobbyWorld(canvasRef.current, {
        quality: defaultQuality(), onDuelChange: setDuel, onProfile: setProfile, onPicture: setPicture,
        allowedBalls: () => allowedBalls(profileRef.current.level ?? 0, profileRef.current.boughtBalls ?? []),
      });
      worldRef.current = world;

      showLoadingStep('Connecting', 0.75);
      const [lobbyResult, session, party] = await Promise.all([fetchLobby(), openSession(), getPartyLaunch()]);
      if (disposed) return;
      setLobby(lobbyResult.lobby);
      setProfile(session.profile);
      world.applyLobby(lobbyResult.lobby);

      // A Bloxity party lands in one room of its own; every member reports it once seated there.
      const room = chooseRoom(party);
      const seatingParty = Boolean(party && !party.managed);
      if (seatingParty) partyTimer = setTimeout(() => partyFailed('unreachable'), PARTY_SEAT_LIMIT_MS);
      let seated = false;
      world.start({
        room,
        onWelcome: (joinedRoom) => {
          updateRoom(joinedRoom);
          if (seatingParty && !seated) {
            seated = true;
            clearTimeout(partyTimer);
            partyJoined(joinedRoom);
          }
        },
      });

      // The portal's settings (listening to each also shows its control in the portal menu).
      const number = (value, fallback) => (Number.isFinite(Number.parseFloat(value)) ? Number.parseFloat(value) : fallback);
      stops.push(
        listenSetting('graphics_quality', (value) => { if (QUALITY[value]) world.setQuality(value); }),
        listenSetting('master_volume', (value) => setMasterVolume(number(value, 80) / 100)),
        listenSetting('music_volume', (value) => setMusicVolume(number(value, 80) / 100)),
        listenSetting('show_fps', (value) => showFps(value === 'true')),
        listenSetting('camera_sensitivity', (value) => world.setCameraSensitivity(Math.min(5, Math.max(0.1, number(value, 1))))),
        listenSetting('enable_chat', (value) => world.setChatEnabled(value !== 'false')),
        listenSetting('fullscreen', (value) => {
          if (value === 'true' && !document.fullscreenElement) requestFullscreen();
          else if (value === 'false' && document.fullscreenElement) exitFullscreen();
        }),
      );
      applyAllSettings();

      // Who is playing: signing in or out opens a session as that account (or as the guest again), and
      // everyone else is shown the new name and avatar.
      // (Inside bloxity.io the user often arrives just after the first session opened, as a guest.)
      let sessionUser = session.account?.id ?? null;
      stops.push(onUserChanged(async (next) => {
        refreshGems();
        const id = next?._id ?? null;
        if (id === sessionUser) return;
        sessionUser = id;
        const reopened = await openSession();
        if (disposed || sessionUser !== id) return;
        setProfile(reopened.profile);
        world.refreshPlayer();
      }));
      // The player restyled their avatar (Bloxity's editor): dress the character anew (once for a burst of changes).
      let restyle = 0;
      stops.push(onAvatarChanged(() => {
        clearTimeout(restyle);
        restyle = setTimeout(() => world.refreshPlayer(), 250);
      }), () => clearTimeout(restyle));
      // Chat (Bloxity draws the chat box): each message over its sender's head.
      stops.push(onChatMessage((message) => world.showChat(message)));
      stops.push(onPlayerEvent((event) => {
        if (event === 'respawn_request') world.respawn();
      }));

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
      clearTimeout(partyTimer);
      disposed = true;
      clearInterval(refreshTimer);
      for (const stop of stops) stop?.();
      showFps(false);
      updateRoom('');
      gameplayEnd();
      world?.dispose();
    };
  }, [refreshGems]);

  return (
    <BuyContext.Provider value={buyProduct}>
      <canvas ref={canvasRef} className="world" tabIndex={0} />
      <LobbyScreen
        lobby={lobby} profile={profile} duel={duel} duelActions={duelActions} shopActions={shopActions} onSticker={sendSticker}
        user={user} gems={gemsBalance} picture={picture}
      />
    </BuyContext.Provider>
  );
}
