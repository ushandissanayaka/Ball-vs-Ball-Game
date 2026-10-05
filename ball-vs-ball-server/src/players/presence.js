import { randomBytes } from 'node:crypto';
import { WebSocketServer } from 'ws';
import { isAllowedOrigin } from '../config/env.js';
import { touchSession } from './sessions.js';
import { playerInfo } from './playerInfo.js';

// Everyone in the lobby, live: a WebSocket at /ws. A player says hello with their session (and name and skin),
// then sends where they stand about ten times a second; ten times a second everyone is sent where everyone else
// stands. Arrivals and departures (with names and skins) are sent once, as they happen.
//   client -> server   { t: 'hello', sessionToken, name, avatar }
//                      { t: 'move', p: [x, y, z, yaw, speed, flags] }    flags: 1 in the air, 2 on a duel square
//   server -> client   { t: 'welcome', id }
//                      { t: 'join', players: [{ id, name, avatar, p }] }
//                      { t: 'leave', id }
//                      { t: 'state', p: [[id, x, y, z, yaw, speed, flags], ...] }
const TICK_MS = 100;
const PING_MS = 15_000;
const LIMIT = 4000; // the lobby is about 3000 units across: anything further out is nonsense

const round = (v, digits = 100) => Math.round(v * digits) / digits;
const num = (v, max) => (Number.isFinite(v) ? Math.max(-max, Math.min(max, v)) : 0);

export function attachPresence(server) {
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4096 });
  const players = new Map(); // socket -> { id, guestId, name, avatar, p }

  const send = (socket, message) => {
    if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
  };
  const toOthers = (from, message) => {
    const text = JSON.stringify(message);
    for (const socket of players.keys()) if (socket !== from && socket.readyState === socket.OPEN) socket.send(text);
  };
  const shown = (player) => ({ id: player.id, name: player.name, avatar: player.avatar, p: player.p });

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
        const { name, avatar } = playerInfo(message);
        const joined = { id: randomBytes(5).toString('hex'), guestId, sessionToken, name, avatar, p: [0, 0, 0, 0, 0, 0], placed: false };
        players.set(socket, joined);
        send(socket, { t: 'welcome', id: joined.id });
        send(socket, { t: 'join', players: [...players.values()].filter((other) => other !== joined && other.placed).map(shown) });
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
      if (player.placed) toOthers(socket, { t: 'leave', id: player.id });
    });
  });

  const tick = setInterval(() => {
    if (players.size < 2) return;
    const state = JSON.stringify({ t: 'state', p: [...players.values()].filter((player) => player.placed).map((player) => [player.id, ...player.p]) });
    for (const socket of players.keys()) if (socket.readyState === socket.OPEN) socket.send(state);
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
