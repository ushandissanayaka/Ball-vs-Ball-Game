import { Router } from 'express';
import { ROUTES } from '../shared/constants.js';
import { getOrCreateProfile, publicProfile } from '../players/profiles.js';
import { createSession } from '../players/sessions.js';

/** POST { guestId? } → { guestId, sessionToken, profile }. A missing or unknown guestId starts a new guest. */
export function sessionRouter() {
  const router = Router();
  router.post(ROUTES.session, (request, response) => {
    const now = Date.now();
    const { guestId, profile } = getOrCreateProfile(request.body?.guestId, now);
    response.set('Cache-Control', 'no-store');
    response.json({ guestId, sessionToken: createSession(guestId, now), profile: publicProfile(profile, now) });
  });
  return router;
}
