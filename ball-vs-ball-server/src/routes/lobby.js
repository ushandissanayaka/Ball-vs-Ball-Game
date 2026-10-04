import { Router } from 'express';
import { ROUTES } from '../shared/constants.js';
import { getLobbySnapshot } from '../gameplay/lobbySnapshot.js';
import { watchArenas } from '../objects/duelArenas.js';

/**
 * Everything the lobby world and HUD show that isn't per player; and, asked every couple of seconds, who stands
 * on each arena (so everyone sees a player waiting there, with their picture and name on the arena's screen).
 */
export function lobbyRouter() {
  const router = Router();
  router.get(ROUTES.lobby, (_request, response) => {
    response.set('Cache-Control', 'no-store');
    response.json(getLobbySnapshot(Date.now()));
  });
  router.get(ROUTES.arenas, (_request, response) => {
    response.set('Cache-Control', 'no-store');
    response.json({ serverTime: Date.now(), arenas: watchArenas() });
  });
  return router;
}
