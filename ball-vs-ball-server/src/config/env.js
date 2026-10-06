import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const list = (value, fallback) => (value || fallback).split(',').map((item) => item.trim()).filter(Boolean);
const serverRoot = fileURLToPath(new URL('../../', import.meta.url));

// 2568, not 2567: the other Legion game in this workspace already uses 2567 locally, and two servers can't
// share a port. Render sets PORT itself.
export const DEFAULT_PORT = 2568;

export const config = {
  port: Number(process.env.PORT || DEFAULT_PORT),
  // Any local port: Vite moves to 5174, 5175... when 5173 is taken by another project.
  allowedOrigins: list(process.env.CLIENT_ORIGIN, 'http://localhost:*,http://127.0.0.1:*'),
  dataDir: resolve(serverRoot, process.env.DATA_DIR || 'data'),
  // Bloxity: the slug this game is registered under, where its API is, and the secret its Gems webhook sends
  // (x-legion-webhook-secret). Without a secret the webhook refuses every call (Bloxity then refunds the Gems).
  gameSlug: process.env.BLOXITY_GAME_SLUG || 'ball-vs-ball',
  bloxityApiUrl: (process.env.BLOXITY_API_URL || 'https://api.bloxity.io').replace(/\/$/, ''),
  webhookSecret: process.env.BLOXITY_WEBHOOK_SECRET || '',
};

const escapeRegExp = (text) => text.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
const originPatterns = config.allowedOrigins.map(
  (origin) => new RegExp(`^${escapeRegExp(origin).replace(/\*/g, '[a-z0-9-]+')}$`, 'i'),
);

/** cors() origin check: exact origins, or ones with `*` standing for one host label or port (Netlify previews, local ports). */
export function isAllowedOrigin(origin) {
  return !origin || originPatterns.some((pattern) => pattern.test(origin));
}
