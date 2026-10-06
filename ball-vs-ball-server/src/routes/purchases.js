import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { config } from '../config/env.js';
import { ROUTES } from '../shared/constants.js';
import { grantPurchase } from '../shared/rewards.js';
import { getOrCreateAccountProfile, publicProfile } from '../players/profiles.js';
import { getProfile, setProfile } from '../progress/profileStore.js';
import { touchSession } from '../players/sessions.js';

// Gems purchases. The player buys through the Bloxity SDK (gems.requestPurchase); once Bloxity has taken the
// Gems it calls this server's webhook, which grants the product. Anything but a 2xx answer makes Bloxity refund
// the Gems, so a product is only answered 200 once it has been granted (or was already, for a repeated call).
//   POST /api/bloxity/webhook  (from Bloxity)  { transactionId, userId, username, gameSlug, sku, metadata, ... }
//   POST /api/purchase/status  { sessionToken, transactionId } -> { granted, profile }  (the client polls it)
// metadata.giftTo (a Bloxity user id) sends the product to that player instead of the buyer.
const ACCOUNT_ID = /^[A-Za-z0-9_-]{1,64}$/;
const TRANSACTION_ID = /^[A-Za-z0-9_.:-]{1,128}$/;
const KEEP_TRANSACTIONS = 200; // per profile, for spotting a repeated webhook call

const sameSecret = (given) => {
  const a = Buffer.from(String(given ?? ''));
  const b = Buffer.from(config.webhookSecret);
  return a.length === b.length && timingSafeEqual(a, b);
};

const granted = (profile, transactionId) => Array.isArray(profile?.transactions) && profile.transactions.includes(transactionId);

export function purchaseRouter() {
  const router = Router();
  if (!config.webhookSecret) {
    console.warn('BLOXITY_WEBHOOK_SECRET is not set: Gems purchases will be refused (and refunded) until it is.');
  }

  router.post(ROUTES.bloxityWebhook, (request, response) => {
    response.set('Cache-Control', 'no-store');
    if (!config.webhookSecret) return response.status(503).json({ error: 'Webhook not configured' });
    if (!sameSecret(request.get('x-legion-webhook-secret'))) return response.status(401).json({ error: 'Bad secret' });
    const { transactionId, userId, gameSlug, sku, metadata } = request.body ?? {};
    if (gameSlug !== config.gameSlug) return response.status(400).json({ error: 'Wrong game' });
    if (!TRANSACTION_ID.test(String(transactionId ?? '')) || !ACCOUNT_ID.test(String(userId ?? ''))) {
      return response.status(400).json({ error: 'Bad purchase' });
    }
    const giftTo = metadata?.giftTo;
    const recipient = typeof giftTo === 'string' && ACCOUNT_ID.test(giftTo) ? giftTo : userId;
    const now = Date.now();
    const { key, profile } = getOrCreateAccountProfile(recipient, null, now);
    if (granted(profile, transactionId)) return response.json({ ok: true, duplicate: true });
    const error = grantPurchase(profile, String(sku ?? ''));
    if (error) {
      console.warn(`Gems purchase ${transactionId} refused: unknown sku "${sku}"`);
      return response.status(400).json({ error: 'Unknown product' });
    }
    profile.transactions = [...(profile.transactions ?? []), transactionId].slice(-KEEP_TRANSACTIONS);
    setProfile(key, profile);
    // The buyer of a gift is told it went through by their own record of it.
    if (recipient !== userId) {
      const buyer = getOrCreateAccountProfile(userId, null, now);
      buyer.profile.transactions = [...(buyer.profile.transactions ?? []), transactionId].slice(-KEEP_TRANSACTIONS);
      setProfile(buyer.key, buyer.profile);
    }
    console.log(`Gems purchase ${transactionId}: ${sku} for ${recipient === userId ? userId : `${recipient} (gift from ${userId})`}`);
    return response.json({ ok: true });
  });

  router.post(ROUTES.purchaseStatus, (request, response) => {
    response.set('Cache-Control', 'no-store');
    const now = Date.now();
    const key = touchSession(String(request.body?.sessionToken ?? ''), now);
    const profile = key && getProfile(key);
    if (!profile) return response.status(401).json({ error: 'Session expired' });
    response.json({ granted: granted(profile, String(request.body?.transactionId ?? '')), profile: publicProfile(profile, now) });
  });
  return router;
}
