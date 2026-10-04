import { Router } from 'express';
import { ROUTES } from '../shared/constants.js';
import { buyStoreItem, claimDailyGems, claimDailyReward, fuseItem, openCrate } from '../shared/rewards.js';
import { publicProfile } from '../players/profiles.js';
import { getProfile, setProfile } from '../progress/profileStore.js';
import { touchSession } from '../players/sessions.js';

/**
 * Daily rewards, the store and crates. All take { sessionToken } (from POST /api/session) and answer
 * { profile, ... } or 409 { error }:
 *   POST /api/daily/claim  { day }           -> { profile }            (locked, claimed)
 *   POST /api/store/buy    { item }          -> { profile }            (unknown, bux, coins)
 *   POST /api/crate/open   { crate, count }  -> { profile, prizes }    (unknown, coins, gems)
 *   POST /api/gems/daily                     -> { profile }            (claimed)
 *   POST /api/fuse  { kind, id, mode }       -> { profile }            (unknown, few)
 */
export function shopRouter() {
  const router = Router();
  // `apply` changes the profile and returns null (done), an error string, or { error } / extra answer fields.
  const act = (route, apply) => {
    router.post(route, (request, response) => {
      response.set('Cache-Control', 'no-store');
      const now = Date.now();
      const guestId = touchSession(String(request.body?.sessionToken ?? ''), now);
      const profile = guestId && getProfile(guestId);
      if (!profile) return response.status(401).json({ error: 'Session expired' });
      const result = apply(profile, request.body ?? {}, now);
      const error = typeof result === 'string' ? result : result?.error;
      if (error) return response.status(409).json({ error });
      setProfile(guestId, profile);
      response.json({ ...(result ?? {}), profile: publicProfile(profile, now) });
    });
  };
  act(ROUTES.dailyClaim, (profile, body, now) => claimDailyReward(profile, Number(body.day), now));
  act(ROUTES.storeBuy, (profile, body) => buyStoreItem(profile, String(body.item ?? '')));
  act(ROUTES.crateOpen, (profile, body) => openCrate(profile, String(body.crate ?? ''), Number(body.count)));
  act(ROUTES.dailyGems, (profile, _body, now) => claimDailyGems(profile, now));
  act(ROUTES.fuse, (profile, body) => fuseItem(profile, String(body.kind ?? ''), String(body.id ?? ''), String(body.mode ?? '')));
  return router;
}
