import { Router } from 'express';
import { ROUTES } from '../shared/constants.js';
import { getOrCreateAccountProfile, getOrCreateProfile, publicProfile } from '../players/profiles.js';
import { createSession } from '../players/sessions.js';
import { verifyBloxityToken } from '../players/bloxityAuth.js';

/**
 * POST { guestId?, bloxityToken? } → { guestId, account, sessionToken, profile }. A missing or unknown guestId
 * starts a new guest. With a Bloxity token (from the SDK's auth.getToken()) that Bloxity vouches for, the session
 * plays as that account (`account`: { id, name }), whose progress follows it to any device; otherwise as the guest.
 */
export function sessionRouter() {
  const router = Router();
  router.post(ROUTES.session, async (request, response) => {
    try {
      const guest = getOrCreateProfile(request.body?.guestId, Date.now());
      const account = await verifyBloxityToken(request.body?.bloxityToken);
      const now = Date.now();
      const { key, profile } = account
        ? getOrCreateAccountProfile(account.id, guest.guestId, now)
        : { key: guest.guestId, profile: guest.profile };
      response.set('Cache-Control', 'no-store');
      response.json({ guestId: guest.guestId, account, sessionToken: createSession(key, now, account), profile: publicProfile(profile, now) });
    } catch (error) {
      console.error('Could not open a session:', error);
      response.status(500).json({ error: 'Could not open a session' });
    }
  });
  return router;
}
