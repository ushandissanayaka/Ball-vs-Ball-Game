import { randomBytes } from 'node:crypto';
import { WebSocketServer } from 'ws';
import { isAllowedOrigin } from '../config/env.js';
import { sessionAccount, touchSession } from './sessions.js';
import { playerInfo } from './playerInfo.js';

// Everyone in the lobby, live: a WebSocket at /ws. A player says hello with their session (and name, avatar and
// room), then sends where they stand about ten times a second; ten times a second everyone is sent where everyone
// else in their room stands. Arrivals and departures (with names and avatars) are sent once, as they happen.
// Rooms: 'lobby' is everyone's; a Bloxity party plays in its own, 'party-<key>', which only those given the key
// (the party's members, and friends they invite with a link) can join.
//   client -> server   { t: 'hello', sessionToken, name, avatar, room? }
//                      { t: 'move', p: [x, y, z, yaw, speed, flags] }    flags: 1 in the air, 2 on a duel square
//                      { t: 'sticker', s }                               an emoji over their head (0-5)
//   server -> client   { t: 'welcome', id, room }
//                      { t: 'join', players: [{ id, userId, name, avatar, p }], existing? }   existing: already there when you came
//                      { t: 'leave', id }
//                      { t: 'state', p: [[id, x, y, z, yaw, speed, flags], ...] }
//                      { t: 'sticker', id, s }
const TICK_MS = 100;
const PING_MS = 15_000;
const LIMIT = 4000;
const STICKERS = 6;
const STICKER_GAP_MS = 900; // one sticker a second at most per player (no spamming the others) // the lobby is about 3000 units across: anything further out is nonsense

const LOBBY = 'lobby';
const ROOM = /^party-[A-Za-z0-9_-]{1,64}$/;
const roomOf = (room) => (typeof room === 'string' && ROOM.test(room) ? room : LOBBY);

const round = (v, digits = 100) => Math.round(v * digits) / digits;
const num = (v, max) => (Number.isFinite(v) ? Math.max(-max, Math.min(max, v)) : 0);

export function attachPresence(server) {
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4096 });
  const players = new Map(); // socket -> { id, guestId, userId, room, name, avatar, p }

  const send = (socket, message) => {
    if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
  };
  /** Sends `message` to everyone else in `from`'s room. */
  const toOthers = (from, message, room = players.get(from)?.room) => {
    const text = JSON.stringify(message);
    for (const [socket, other] of players) if (socket !== from && other.room === room && socket.readyState === socket.OPEN) socket.send(text);
  };
  // userId: the player's Bloxity account (as Bloxity vouched for it), so chat messages find their sender; null for guests.
  const shown = (player) => ({ id: player.id, userId: player.userId, name: player.name, avatar: player.avatar, p: player.p });

  wss.on('connection', (socket, request) => {
    if (!isAllowedOrigin(request.headers.origin)) {
      socket.close(1008, 'Origin not allowed');
      return;
    }
    socket.alive = true;
    socket.on('pong', () => { socket.alive = true; });
    socket.on('message', (data) => {
      let message;
      try {
        message = JSON.parse(data);
      } catch {
        return;
      }
      const player = players.get(socket);
      if (message?.t === 'hello' && !player) {
        const sessionToken = String(message.sessionToken ?? '');
        const guestId = touchSession(sessionToken, Date.now());
        if (!guestId) {
          socket.close(4001, 'Session expired');
          return;
        }
        const account = sessionAccount(sessionToken);
        const { name, avatar } = playerInfo(message, account);
        const room = roomOf(message.room);
        const joined = {
          id: randomBytes(5).toString('hex'), guestId, userId: account?.id ?? null, room, sessionToken, name, avatar, p: [0, 0, 0, 0, 0, 0], placed: false,
        };
        players.set(socket, joined);
        send(socket, { t: 'welcome', id: joined.id, room });
        send(socket, { t: 'join', existing: true, players: [...players.values()].filter((other) => other !== joined && other.room === room && other.placed).map(shown) });
      } else if (message?.t === 'sticker' && player?.placed) {
        const s = message.s | 0;
        const now = Date.now();
        if (s < 0 || s >= STICKERS || now - (player.stickerAt ?? 0) < STICKER_GAP_MS) return;
        player.stickerAt = now;
        toOthers(socket, { t: 'sticker', id: player.id, s });
      } else if (message?.t === 'move' && player && Array.isArray(message.p)) {
        const [x, y, z, yaw, speed, flags] = message.p.map(Number);
        player.p = [round(num(x, LIMIT)), round(num(y, LIMIT)), round(num(z, LIMIT)), round(num(yaw, 100), 1000), round(num(speed, 1)), (flags | 0) & 3];
        // Others hear of a player once they know where they stand (not at the origin first).
        if (!player.placed) {
          player.placed = true;
          toOthers(socket, { t: 'join', players: [shown(player)] });
        }
      }
    });
    socket.on('close', () => {
      const player = players.get(socket);
      if (!player) return;
      players.delete(socket);
      if (player.placed) toOthers(socket, { t: 'leave', id: player.id }, player.room);
    });
  });

  const tick = setInterval(() => {
    if (players.size < 2) return;
    const rooms = new Map(); // room -> [sockets, poses]
    for (const [socket, player] of players) {
      if (!rooms.has(player.room)) rooms.set(player.room, [[], []]);
      const [sockets, poses] = rooms.get(player.room);
      sockets.push(socket);
      if (player.placed) poses.push([player.id, ...player.p]);
    }
    for (const [sockets, poses] of rooms.values()) {
      if (sockets.length < 2) continue;
      const state = JSON.stringify({ t: 'state', p: poses });
      for (const socket of sockets) if (socket.readyState === socket.OPEN) socket.send(state);
    }
  }, TICK_MS);
  // A connection that stops answering pings (a phone gone to sleep) is dropped, and its player leaves.
  const ping = setInterval(() => {
    for (const socket of wss.clients) {
      if (!socket.alive) {
        socket.terminate();
        continue;
      }
      socket.alive = false;
      socket.ping();
    }
  }, PING_MS);
  // Sessions only stay alive while used: being in the lobby counts.
  const keepAlive = setInterval(() => {
    for (const player of players.values()) touchSession(player.sessionToken, Date.now());
  }, 30_000);
  tick.unref();
  ping.unref();
  keepAlive.unref();
  return { count: () => players.size };
}
