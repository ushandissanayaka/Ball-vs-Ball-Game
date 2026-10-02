import { Router } from 'express';
import { GAME, ROUTES } from '../shared/constants.js';

/** Render's health check, and a quick way to see the server is awake. */
export function healthRouter() {
  const router = Router();
  router.get(ROUTES.health, (_request, response) => response.json({ ok: true, service: GAME.slug }));
  return router;
}
