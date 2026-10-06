import { Router } from 'express';
import { ROUTES } from '../shared/constants.js';
import { DUEL_TIMING, chooseBall, lockAim, reroll } from '../shared/duelMatch.js';
import { actInDuel, arenaState, joinArena, leaveArena } from '../objects/duelArenas.js';
import { guestBalls, publicProfile } from '../players/profiles.js';
import { getProfile, setProfile } from '../progress/profileStore.js';
import { sessionAccount, touchSession } from '../players/sessions.js';
import { playerInfo } from '../players/playerInfo.js';

/**
 * Standing on a duel arena's spot, and the duel that starts when both spots are taken. All take
 * { sessionToken } (from POST /api/session):
 *   POST /api/arena/join   { arenaId, spot: 'pink' | 'blue', name, avatar }  -> { arena, spot, duel }  (409 if full)
 *   POST /api/arena/leave                                                    -> { arena | null }
 *   POST /api/arena/state  (poll while on a spot)          -> { serverTime, seated, spot, arena, duel, profile }
 *   POST /api/duel/choose  { ball }                                          -> { serverTime, duel }
 *   POST /api/duel/aim     { x, y }  (locks it)                              -> { serverTime, duel }
 *   POST /api/duel/reroll  (costs gems)                                      -> { serverTime, duel, profile }
 */
export function arenaRouter() {
  const router = Router();
  const guestOf = (request, response) => {
    response.set('Cache-Control', 'no-store');
    const guestId = touchSession(String(request.body?.sessionToken ?? ''), Date.now());
    if (!guestId) response.status(401).json({ error: 'Session expired' });
    return guestId;
  };
  const profileOf = (guestId, now) => {
    const profile = getProfile(guestId);
    return profile ? publicProfile(profile, now) : null;
  };

  router.post(ROUTES.arenaJoin, (request, response) => {
    const guestId = guestOf(request, response);
    if (!guestId) return;
    const now = Date.now();
    const { arenaId, spot } = request.body ?? {};
    // The balls this player may use come from their saved level, never from what the client says.
    const info = { ...playerInfo(request.body, sessionAccount(String(request.body?.sessionToken ?? ''))), allowed: guestBalls(getProfile(guestId)) };
    const result = joinArena(guestId, String(arenaId ?? ''), String(spot ?? ''), info, now);
    if (result.error) response.status(409).json(result);
    else response.json({ serverTime: now, ...result });
  });

  router.post(ROUTES.arenaLeave, (request, response) => {
    const guestId = guestOf(request, response);
    if (!guestId) return;
    response.json({ arena: leaveArena(guestId) });
  });

  router.post(ROUTES.arenaState, (request, response) => {
    const guestId = guestOf(request, response);
    if (!guestId) return;
    const now = Date.now();
    response.json({ serverTime: now, ...arenaState(guestId, now), profile: profileOf(guestId, now) });
  });

  const duelAction = (route, act, after = () => ({})) => {
    router.post(route, (request, response) => {
      const guestId = guestOf(request, response);
      if (!guestId) return;
      const now = Date.now();
      const result = actInDuel(guestId, now, (match, side) => act(match, side, request.body ?? {}, guestId));
      if (result.error) response.status(result.status).json({ error: result.error });
      else response.json({ serverTime: now, duel: result.duel, ...after(guestId, now) });
    });
  };

  duelAction(ROUTES.duelChoose, (match, side, body) => chooseBall(match, side, body.ball));
  duelAction(ROUTES.duelAim, (match, side, body) => lockAim(match, side, Number(body.x), Number(body.y)));
  duelAction(
    ROUTES.duelReroll,
    (match, side, _body, guestId) => {
      const profile = getProfile(guestId);
      if (!profile || profile.gems < DUEL_TIMING.rerollCost) return 'Not enough gems';
      const error = reroll(match, side);
      if (error) return error;
      profile.gems -= DUEL_TIMING.rerollCost;
      setProfile(guestId, profile);
      return null;
    },
    (guestId, now) => ({ profile: profileOf(guestId, now) }),
  );
  return router;
}
