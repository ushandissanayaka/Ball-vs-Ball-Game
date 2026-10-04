// The game's one way into the Bloxity Legion SDK (window.Legion.SDK). Every call is safe without the SDK
// (a local preview, or if its script failed to load): it does nothing.

const GAME_SLUG = import.meta.env.VITE_GAME_SLUG || 'ball-vs-ball';
// Named outright: left out, the SDK assumes on localhost that the portal itself runs locally.
const PORTAL_URL = import.meta.env.VITE_BLOXITY_PORTAL_URL || 'https://bloxity.io';
const API_URL = import.meta.env.VITE_BLOXITY_API_URL || 'https://api.bloxity.io';

const sdk = () => (typeof window !== 'undefined' ? window.Legion?.SDK ?? null : null);
const noop = () => {};
let initialized = false;

/** Initialises the SDK once. The script tag loads with `defer`, so call this after the page has parsed. */
export function startBloxity() {
  const legion = sdk();
  if (!legion || initialized) return;
  try {
    legion.init?.({ gameSlug: GAME_SLUG, portalUrl: PORTAL_URL, apiUrl: API_URL });
    initialized = true;
  } catch (error) {
    console.info('Bloxity SDK could not start:', error);
  }
}

// ---- Loading and gameplay lifecycle (shown by the portal) ----------------------------------------------
export const loadingStep = (message) => sdk()?.game?.loadingStep?.(message);
export const loadingEnd = () => sdk()?.game?.loadingEnd?.();
export const gameplayStart = () => sdk()?.game?.gameplayStart?.();
export const gameplayEnd = () => sdk()?.game?.gameplayEnd?.();

// ---- Settings ----------------------------------------------------------------------------------------
/** Calls `listener(value)` now and whenever the player changes `key` in the portal menu; returns the unsubscribe. */
export const listenSetting = (key, listener) => sdk()?.settings?.listen?.(key, listener) ?? noop;
export const applyAllSettings = () => sdk()?.settings?.triggerAll?.();

// ---- Avatar and friends ------------------------------------------------------------------------------
/**
 * The player's Legion avatar as the SDK describes it: { equipped (item ids by slot), proportions, skinUrl (the
 * skin texture with face, shirt and trousers drawn on) }. Without the SDK, the default avatar.
 */
export function getAvatarSpec() {
  const avatar = sdk()?.avatar;
  try {
    if (avatar) return { equipped: avatar.getEquipped?.() ?? {}, proportions: avatar.getProportions?.() ?? {}, skinUrl: avatar.getSkinTextureUrl?.() };
  } catch {
    // Fall through to the default avatar.
  }
  return { equipped: {}, proportions: {} };
}
export const onAvatarChanged = (listener) => sdk()?.avatar?.onAvatarChanged?.(listener) ?? noop;

/** The name shown over the player in a duel: their Bloxity display name or username, else the guest name. */
export function getPlayerName() {
  try {
    const user = sdk()?.auth?.getUser?.();
    const guest = user ? null : sdk()?.auth?.getGuest?.();
    const name = user?.displayName || user?.username || guest?.username;
    if (name) return String(name);
  } catch {
    // Fall through to a made-up guest name.
  }
  return `Guest${Math.floor(1000 + Math.random() * 9000)}`;
}

/** A link friends can open to come and play (the portal's invite link when embedded, else this page). */
export function getInviteLink() {
  try {
    return sdk()?.social?.getInviteFriendsLink?.() || window.location.href;
  } catch {
    return window.location.href;
  }
}

/**
 * The player's Bloxity friends, for the Invite Friends window: [{ id, name, avatarUrl, online }] (empty when
 * signed out or without the SDK). The SDK hands them over as the portal or the API gives them, so the fields
 * are read whichever way they come.
 */
export async function getFriends() {
  try {
    const list = (await sdk()?.social?.getFriends?.()) ?? [];
    return list
      .map((friend) => {
        const user = friend.user ?? friend.friend ?? friend;
        return {
          id: user.id ?? user.userId ?? friend.userId ?? friend.id,
          name: String(user.displayName || user.username || user.name || 'Friend'),
          avatarUrl: user.avatarUrl || user.headshotUrl || user.avatar || user.profilePictureUrl || null,
          online: Boolean(user.isOnline ?? user.online ?? (user.status ? user.status === 'online' : false)),
        };
      })
      .filter((friend) => friend.id != null);
  } catch {
    return [];
  }
}

/** Sends `friendId` an invite to this game through the portal; resolves true when it went. */
export async function inviteFriend(friendId) {
  try {
    return Boolean(await sdk()?.social?.inviteFriend?.(friendId));
  } catch {
    return false;
  }
}
