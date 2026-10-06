import { cleanEquipped, cleanProportions } from '../shared/avatar.js';

// The game's one way into the Bloxity SDK (window.Legion.SDK): login, avatars, friends, settings, rooms and
// parties, chat, and Gems purchases. Every call is safe without the SDK (a local preview, or if its script failed
// to load): it does nothing, or answers as a signed-out guest would. The SDK works out by itself whether the game
// is embedded in bloxity.io (it talks to the portal) or hosted standalone (it talks to api.bloxity.io).

const GAME_SLUG = import.meta.env.VITE_GAME_SLUG || 'ball-vs-ball';
// Named outright: left out, the SDK assumes on localhost that the portal itself runs locally.
const PORTAL_URL = import.meta.env.VITE_BLOXITY_PORTAL_URL || 'https://bloxity.io';
const API_URL = import.meta.env.VITE_BLOXITY_API_URL || 'https://api.bloxity.io';
// The most players one of this game's rooms seats together (Bloxity parties hold up to 6; the lobby holds more).
const MAX_PARTY_SIZE = 6;

const sdk = () => (typeof window !== 'undefined' ? window.Legion?.SDK ?? null : null);
const noop = () => {};
/** False in a local preview without the SDK (its script didn't load). */
export const hasBloxity = () => Boolean(sdk());
/** Runs `call(sdk)`; anything it throws (an older SDK, a portal hiccup) gives `fallback` instead. */
function safely(call, fallback) {
  const legion = sdk();
  if (!legion) return fallback;
  try {
    return call(legion) ?? fallback;
  } catch (error) {
    console.info('Bloxity SDK call failed:', error?.message ?? error);
    return fallback;
  }
}
async function safelyAsync(call, fallback) {
  try {
    return (await safely(call, fallback)) ?? fallback;
  } catch (error) {
    console.info('Bloxity SDK call failed:', error?.message ?? error);
    return fallback;
  }
}

// ---- Start -------------------------------------------------------------------------------------------------
let started = false;
const userListeners = new Set();

/**
 * Initialises the SDK once, and subscribes once to the signed-in user (the game's single source of truth for
 * who is playing; see onUserChanged). The script tag loads with `defer`, so call this after the page has parsed.
 */
export function startBloxity() {
  const legion = sdk();
  if (!legion || started) return;
  try {
    legion.init({ gameSlug: GAME_SLUG, portalUrl: PORTAL_URL, apiUrl: API_URL });
    started = true;
    // Parties are seated in one room by this game's own server (see App.jsx and the server's presence.js).
    legion.party?.enable?.({ maxPartySize: MAX_PARTY_SIZE });
    legion.auth.onUserChanged((user) => {
      console.info(`Bloxity: ${user ? `signed in as ${user.displayName || user.username}` : 'not signed in'}`);
      for (const listener of userListeners) {
        try {
          listener(user ?? null);
        } catch (error) {
          console.error('Bloxity user listener failed:', error);
        }
      }
    });
    console.info(`Bloxity SDK started (${isEmbedded() ? 'embedded in bloxity.io' : 'standalone'}, game "${GAME_SLUG}")`);
  } catch (error) {
    console.info('Bloxity SDK could not start:', error);
  }
}

// ---- Auth --------------------------------------------------------------------------------------------------
/** The signed-in Bloxity user ({ _id, username, displayName?, pfp?, ... }) or null. Read fresh each time: never keep it. */
export const getUser = () => safely((legion) => legion.auth.getUser(), null);
/** The signed-in user's token (a JWT, for this game's server to verify), or null. */
export const getToken = () => safely((legion) => legion.auth.getToken(), null);
export const isLoggedIn = () => safely((legion) => legion.auth.isLoggedIn(), false);

/**
 * Calls `listener(user | null)` now and whenever the player signs in or out; returns the unsubscribe. All of
 * these share the one SDK subscription made in startBloxity.
 */
export function onUserChanged(listener) {
  userListeners.add(listener);
  listener(getUser());
  return () => userListeners.delete(listener);
}

/** Opens Bloxity's login (an in-game window when embedded, a popup when standalone); resolves to the user or null. */
export const showLogin = () => safelyAsync((legion) => legion.auth.showAuthPopup(), null);
export const logout = () => safely((legion) => legion.auth.logout());

/** The name shown over the player: their Bloxity display name or username, else the SDK's guest name, else a made-up one. */
let madeUpName = null;
export function getPlayerName() {
  const user = getUser();
  const guest = user ? null : safely((legion) => legion.auth.getGuest?.(), null);
  const name = user?.displayName || user?.username || guest?.username;
  if (name) return String(name);
  madeUpName ??= `Guest${Math.floor(1000 + Math.random() * 9000)}`;
  return madeUpName;
}

// ---- Avatar ------------------------------------------------------------------------------------------------
/**
 * The player's avatar as the SDK describes it: { equipped (item ids by slot, only those worn), proportions,
 * skinUrl (the skin texture with the worn face, shirt and trousers drawn on) }. Without the SDK, the default avatar.
 */
export function getAvatarSpec() {
  return safely((legion) => ({
    equipped: cleanEquipped(legion.avatar.getEquipped()),
    proportions: cleanProportions(legion.avatar.getProportions()),
    skinUrl: legion.avatar.getSkinTextureUrl?.() || undefined,
  }), { equipped: {}, proportions: cleanProportions({}) });
}
/** `listener()` whenever the player changes what their avatar wears, or its proportions; returns the unsubscribe. */
export function onAvatarChanged(listener) {
  const stops = [
    safely((legion) => legion.avatar.onAvatarChanged(() => listener()), noop),
    safely((legion) => legion.avatar.onProportionsChanged(() => listener()), noop),
  ];
  return () => stops.forEach((stop) => stop());
}
export const toggleAvatarEditor = () => safely((legion) => legion.avatar.toggleCustomizer());
export const setProportions = (partial) => safelyAsync((legion) => legion.avatar.setProportions(partial), null);
export const resetProportions = () => safelyAsync((legion) => legion.avatar.resetProportions(), null);

// ---- Friends -----------------------------------------------------------------------------------------------
/**
 * The player's Bloxity friends: [{ id, name, username, avatarUrl, status, online }] (empty when signed out or
 * without the SDK). `status` is 'online', 'in-game', 'away' or 'offline'.
 */
export async function getFriends() {
  const list = await safelyAsync((legion) => legion.social.getFriends(), []);
  return (Array.isArray(list) ? list : [])
    .map((friend) => {
      const status = friend.presence?.status ?? 'offline';
      return {
        id: friend._id,
        name: String(friend.displayName || friend.username || 'Friend'),
        username: String(friend.username || ''),
        avatarUrl: friend.pfp || null,
        status,
        online: status !== 'offline',
      };
    })
    .filter((friend) => friend.id != null);
}

/** A link friends can open to join this room (the portal's game page when embedded, else this page). */
export const getInviteLink = () => safely((legion) => legion.social.getInviteFriendsLink(), window.location.href);

/** Sends `friendId` an invite into this room (the room is reported first, so they land in it); resolves true when it went. */
export async function inviteFriend(friendId) {
  if (currentRoom) updateRoom(currentRoom);
  return Boolean(await safelyAsync((legion) => legion.social.inviteFriend(friendId), false));
}
export const sendFriendRequest = (userId) => safelyAsync((legion) => legion.social.sendFriendRequest(userId), { success: false });

// ---- Settings ----------------------------------------------------------------------------------------------
/**
 * Calls `listener(value)` (a string) now and whenever the player changes `key` in the portal menu; returns the
 * unsubscribe. Listening also shows that setting's control in the portal menu.
 */
export const listenSetting = (key, listener) => safely((legion) => legion.settings.listen(key, listener), noop);
export const applyAllSettings = () => safely((legion) => legion.settings.triggerAll());

// ---- Game lifecycle and rooms ------------------------------------------------------------------------------
export const loadingStep = (message) => safely((legion) => legion.game.loadingStep(message));
export const loadingEnd = () => safely((legion) => legion.game.loadingEnd());
export const gameplayStart = () => safely((legion) => legion.game.gameplayStart());
export const gameplayEnd = () => safely((legion) => legion.game.gameplayEnd());

let currentRoom = '';
/** Tells Bloxity which room the player is in (friends can then join it); '' when not in one. */
export function updateRoom(roomId, partyId) {
  currentRoom = roomId || '';
  safely((legion) => legion.game.updateRoom(currentRoom, partyId));
}
/** Someone joined the player's room (a friend gets a toast). */
export const playerJoined = (name) => safely((legion) => legion.game.playerJoined(name));
/** Someone was already in the room the player joined (a friend gets a toast). */
export const playerInRoom = (name) => safely((legion) => legion.game.playerInRoom(name));

// ---- Parties -----------------------------------------------------------------------------------------------
/**
 * The party this launch belongs to: null when playing solo, else { launchId, roomKey, size, members, managed, ... }.
 * Party launches only come from the portal, so standalone it answers null at once.
 */
export function getPartyLaunch() {
  if (!isEmbedded()) return Promise.resolve(null);
  return safelyAsync((legion) => legion.party.getLaunch(), null);
}
/** The whole party is seated in room `roomId` (every member reports the same id). */
export const partyJoined = (roomId) => safely((legion) => legion.party.joined(roomId));
/** The party could not be seated together. */
export const partyFailed = (reason) => safely((legion) => legion.party.failed(reason));

// ---- Player events and the portal --------------------------------------------------------------------------
/** `listener(event, data)` for 'respawn_request', 'chat_message_sent' and 'pointer_lock_changed'; returns the unsubscribe. */
export const onPlayerEvent = (listener) => safely((legion) => legion.player.onEvent(listener), noop);
export const isEmbedded = () => safely((legion) => legion.portal.isEmbeddedInLegion(), false);
/** Opens the portal's pause menu (embedded only). */
export const showPortalMenu = () => safely((legion) => legion.portal.showMenu());
export const requestFullscreen = () => safely((legion) => legion.portal.requestFullscreen());
export const exitFullscreen = () => safely((legion) => legion.portal.exitFullscreen());

// ---- Chat --------------------------------------------------------------------------------------------------
/**
 * `listener(message)` for every chat message in the player's room, their own included: { userId, username,
 * text, isGif, at, isLocalPlayer }, sender verified and text filtered by Bloxity. Returns the unsubscribe.
 * Bloxity draws the chat box itself; the game only shows each message over its sender's head.
 */
export const onChatMessage = (listener) => safely((legion) => legion.chat.onMessage(listener), noop);
/** What a chat bubble says: the message on up to two short lines, or 'sent a GIF'. */
export const chatBubbleText = (message) => safely((legion) => legion.chat.bubbleText(message), message.isGif ? 'sent a GIF' : message.text);
export const chatBubbleSeconds = () => safely((legion) => legion.chat.bubbleSeconds, 4);
/**
 * Shows `text` in a speech bubble on `object` (a three.js object; `options`: { height, scale, seconds }), fading
 * after the bubble's time; a newer one on the same object replaces it. Returns { remove() }, or null without the SDK.
 */
export const attachChatBubble = (THREE, object, text, options) => safely((legion) => legion.chat.attachBubble(THREE, object, text, options), null);

// ---- Gems purchases ----------------------------------------------------------------------------------------
/**
 * Buys product `sku` with Gems. Bloxity shows its own purchase window and charges the price in this game's
 * catalog (never one the game names). Signed out, it asks the player to log in first. Resolves to
 * { success, transactionId?, error? }; the game's server is told by Bloxity's webhook and grants the item.
 */
export async function buyWithGems(sku, metadata) {
  if (!sdk()) return { success: false, error: 'unavailable' };
  if (!isLoggedIn() && !isEmbedded()) {
    await showLogin();
    if (!isLoggedIn()) return { success: false, error: 'Not authenticated' };
  }
  const gems = sdk().gems ?? sdk().bux;
  return safelyAsync(() => gems.requestPurchase(sku, metadata), { success: false, error: 'failed' });
}

/** The player's Gems balance, or null when it can't be known (signed out, no SDK). */
export async function getGemsBalance() {
  if (!isLoggedIn()) return null;
  const value = await safelyAsync((legion) => (legion.gems ?? legion.bux).getBalance(), null);
  return Number.isFinite(value) ? value : null;
}

let catalog = null;
/**
 * This game's Gems catalog, as Bloxity prices it: Map sku -> price (empty when it can't be read). For showing
 * prices only; a purchase is always charged at the catalog's price.
 */
export function getGemsCatalog() {
  catalog ??= fetch(`${API_URL}/v1/games/${encodeURIComponent(GAME_SLUG)}/iaps`)
    .then((response) => (response.ok ? response.json() : { iaps: [] }))
    .then(({ iaps }) => new Map((iaps ?? []).filter((iap) => iap?.sku && Number.isFinite(iap.price)).map((iap) => [iap.sku, iap.price])))
    .catch(() => {
      catalog = null; // try again next time
      return new Map();
    });
  return catalog;
}
