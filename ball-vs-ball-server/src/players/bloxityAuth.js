import { config } from '../config/env.js';

// Who a Bloxity token belongs to, asked of Bloxity itself (the client's word is never taken for it). The client
// sends the token from the Bloxity SDK (auth.getToken()) when it opens a session.
const CACHE_MS = 10 * 60_000;
const TIMEOUT_MS = 6000;
const cache = new Map(); // token -> { account, until }

const accountOf = (body) => {
  const user = body?.user ?? body;
  const id = user?._id ?? user?.id;
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) return null;
  return { id, name: String(user.displayName || user.username || '').slice(0, 40) || null };
};

async function ask(path, token, post) {
  const response = await fetch(`${config.bloxityApiUrl}${path}`, {
    method: post ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, ...(post ? { 'Content-Type': 'application/json' } : {}) },
    body: post ? JSON.stringify({ gameSlug: config.gameSlug }) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return response.ok ? accountOf(await response.json()) : null;
}

/** The Bloxity account `token` belongs to ({ id, name }), or null (no token, a bad one, or Bloxity unreachable). */
export async function verifyBloxityToken(token) {
  if (typeof token !== 'string' || !token || token.length > 4096) return null;
  const now = Date.now();
  const hit = cache.get(token);
  if (hit && hit.until > now) return hit.account;
  let account = null;
  try {
    // A token made for this game is checked against it; a plain Bloxity login token by who it belongs to.
    account = (await ask('/v1/auth/game-token/verify', token, true).catch(() => null)) ?? (await ask('/v1/auth/me', token, false));
  } catch (error) {
    console.warn('Could not verify a Bloxity token:', error.message);
    return null;
  }
  if (cache.size > 2000) cache.clear();
  if (account) cache.set(token, { account, until: now + CACHE_MS });
  return account;
}
