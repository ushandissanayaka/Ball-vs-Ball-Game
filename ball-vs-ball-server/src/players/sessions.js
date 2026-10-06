import { randomBytes } from 'node:crypto';
import { leaveArena } from '../objects/duelArenas.js';

// Live sessions: token → { guestId, account, lastSeen }. Gameplay requests name their session with the token.
// `guestId` is the profile the session plays as: a guest's own id, or 'legion:<id>' for a signed-in Bloxity
// account (`account` is then { id, name }, as Bloxity vouched for it).
// The client polls while it is on an arena spot (see the client's api.js), so 2 minutes of silence means it has gone.
const SESSION_TTL_MS = 2 * 60_000;
const sessions = new Map();

export function createSession(guestId, now, account = null) {
  const token = randomBytes(18).toString('base64url');
  sessions.set(token, { guestId, account, lastSeen: now });
  return token;
}

/** The guest a token belongs to (and keeps the session alive), or null. */
export function touchSession(token, now) {
  const session = sessions.get(token);
  if (!session) return null;
  session.lastSeen = now;
  return session.guestId;
}

/** The Bloxity account a session is signed in as ({ id, name }), or null for a guest. */
export const sessionAccount = (token) => sessions.get(token)?.account ?? null;

setInterval(() => {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [token, session] of sessions) {
    if (session.lastSeen >= cutoff) continue;
    sessions.delete(token);
    leaveArena(session.guestId); // a player who has gone frees their spot
  }
}, 30_000).unref();
