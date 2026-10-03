import { randomBytes } from 'node:crypto';
import { leaveArena } from '../objects/duelArenas.js';

// Live sessions: token → { guestId, lastSeen }. Gameplay requests will name their session with the token.
// The client polls while it is on an arena spot (see the client's api.js), so 2 minutes of silence means it has gone.
const SESSION_TTL_MS = 2 * 60_000;
const sessions = new Map();

export function createSession(guestId, now) {
  const token = randomBytes(18).toString('base64url');
  sessions.set(token, { guestId, lastSeen: now });
  return token;
}

/** The guest a token belongs to (and keeps the session alive), or null. */
export function touchSession(token, now) {
  const session = sessions.get(token);
  if (!session) return null;
  session.lastSeen = now;
  return session.guestId;
}

setInterval(() => {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [token, session] of sessions) {
    if (session.lastSeen >= cutoff) continue;
    sessions.delete(token);
    leaveArena(session.guestId); // a player who has gone frees their spot
  }
}, 30_000).unref();
