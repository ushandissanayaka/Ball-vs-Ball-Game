import { BALL_IDS, isBall } from '../../shared/balls.js';
import { DUEL } from '../../shared/constants.js';
import { advance, chooseBall, createMatch, forfeit, lockAim, otherSide, touch, viewFor } from '../../shared/duelMatch.js';

const BOT_NAMES = ['BounceLord25', 'OrbitQueen', 'PixelPop', 'CometKid', 'TinyTitan', 'GlowGlider', 'ZoomZoom99'];
const between = (min, max) => min + Math.random() * (max - min);
// ?botBall=<id> (with ?bot=1): the bot always picks that ball, for trying a matchup.
const BOT_BALL = new URLSearchParams(window.location.search).get('botBall');

/**
 * A duel played entirely in this browser, against a bot, when the game server can't be reached (or with
 * ?bot=1). Same match rules as the server (shared/duelMatch.js) and the same answers as the server's routes,
 * so the duel director can't tell the difference. The bot steps onto the other spot after a few seconds,
 * then picks a ball and aims like a player would, taking a moment to think.
 */
export function createLocalDuel({ spot, player }) {
  const botSide = otherSide(spot);
  const joinedAt = Date.now();
  const botArrives = joinedAt + between(2500, 4500);
  // A random Bloxity skin (the character falls back to the default skin if that one isn't there).
  const skinId = String(1 + Math.floor(Math.random() * 12));
  const bot = { id: 'bot', name: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)], avatar: { equipped: { skinId } } };
  let match = null;
  let thinking = { key: null, at: 0 };
  let gone = false;

  const think = (now) => {
    const key = `${match.phase}:${match.round}`;
    if (thinking.key !== key) thinking = { key, at: now + (match.phase === 'aim' ? between(2500, 7000) : between(1500, 4500)) };
    if (now < thinking.at) return;
    const me = match.players[botSide];
    if (match.phase === 'choose' && !me.ball) {
      const pick = Math.random() < 0.8 ? me.offers[Math.floor(Math.random() * me.offers.length)] : BALL_IDS[Math.floor(Math.random() * BALL_IDS.length)];
      chooseBall(match, botSide, isBall(BOT_BALL) ? BOT_BALL : pick);
    }
    if (match.phase === 'aim' && !me.locked) {
      // Roughly at the other ball, sometimes off the wall instead.
      const toward = botSide === 'pink' ? 1 : -1;
      lockAim(match, botSide, toward * between(0.4, 1), between(-1, 1));
    }
  };

  const state = (now = Date.now()) => {
    if (!gone && !match && now >= botArrives) {
      match = createMatch({
        id: `local-${joinedAt}`, seed: Math.floor(Math.random() * 2 ** 31), now,
        players: { [spot]: { id: 'me', ...player }, [botSide]: bot },
      });
    }
    if (match) {
      touch(match, 'pink', now);
      touch(match, 'blue', now);
      think(now);
      advance(match, now);
      if (match.phase === 'done' || match.phase === 'canceled') {
        gone = true;
        match = null;
      }
    }
    const seated = !gone;
    return {
      serverTime: now, seated, spot: seated ? spot : null,
      arena: seated ? { players: match ? DUEL.playersPerArena : 1, capacity: DUEL.playersPerArena, reward: DUEL.winReward } : null,
      duel: match ? viewFor(match, spot, now) : null,
      profile: null,
    };
  };

  const act = (fn) => {
    if (!match) return { error: 'Not in a duel' };
    const now = Date.now();
    advance(match, now);
    const error = fn(match);
    if (error) return { error };
    advance(match, now);
    return { serverTime: now, duel: viewFor(match, spot, now) };
  };

  return {
    local: true,
    state: async () => state(),
    choose: async (ball) => act((m) => chooseBall(m, spot, ball)),
    aim: async (x, y) => act((m) => lockAim(m, spot, x, y)),
    reroll: async () => ({ error: 'Rerolls need the game server' }),
    leave: async () => {
      if (match) forfeit(match, spot, Date.now());
      gone = true;
      match = null;
      return null;
    },
  };
}
