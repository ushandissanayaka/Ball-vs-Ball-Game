import { Router } from 'express';
import { ROUTES } from '../shared/constants.js';
import { getLobbySnapshot } from '../gameplay/lobbySnapshot.js';

/** Everything the lobby world and HUD show that isn't per player. */
export function lobbyRouter() {
  const router = Router();
  router.get(ROUTES.lobby, (_request, response) => {
    response.set('Cache-Control', 'no-store');
    response.json(getLobbySnapshot(Date.now()));
  });
  return router;
}
