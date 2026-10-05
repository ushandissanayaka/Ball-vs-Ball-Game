// What the opponent is shown: a name, and the skin their character wears (only Bloxity's own hosts).
const SKIN_URL = /^https:\/\/(api|static)\.bloxity\.io\/[\w./-]+\.png$/;
const SKIN_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** A player's name and skin from a request body (cleaned up), as other players are shown them. */
export function playerInfo(body) {
  const name = String(body?.name ?? '').replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 20) || 'Player';
  const skinUrl = typeof body?.avatar?.skinUrl === 'string' && body.avatar.skinUrl.length < 300 && SKIN_URL.test(body.avatar.skinUrl)
    ? body.avatar.skinUrl
    : undefined;
  const skinId = typeof body?.avatar?.skinId === 'string' && SKIN_ID.test(body.avatar.skinId) ? body.avatar.skinId : undefined;
  return { name, avatar: { skinUrl, equipped: skinId ? { skinId } : {} } };
}
