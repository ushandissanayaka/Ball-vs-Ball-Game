import { currentSessionToken, openSession, serverUrl } from './api.js';

// The live link to everyone else in the lobby (the server's /ws, see the server's players/presence.js): says
// hello with this player's session, name, avatar and room, sends where the character stands about ten times a second,
// and hands on the others' arrivals, moves and departures. It reconnects by itself after a drop (waiting longer
// each time), and stays quiet while the server can't be reached, so the game plays the same either way.
const SEND_MS = 100;
const KEEP_MS = 1000; // standing still, it still says where it is now and then

/**
 * `room()`: the room to join ('lobby', or a party's own). `handlers`: onWelcome(id, room) (in the room),
 * onJoin(players, existing) (`existing`: they were there already), onLeave(id), onState(list),
 * onSticker(id, index), onReset() (the link dropped: forget everyone). Returns { setPose(p), sendSticker(index),
 * restart(), dispose() }; `p` is [x, y, z, yaw, speed, flags]; restart() says hello again (the name or avatar changed).
 */
export function connectPresence({ name, avatar, room }, handlers) {
  let socket = null;
  let closed = false;
  let retry = 1000;
  let retryTimer = 0;
  let pose = null;
  let sentKey = '';
  let sentAt = 0;
  let again = false; // reconnect at once (a restart, not a drop)

  const open = async () => {
    if (closed) return;
    if (!currentSessionToken()) await openSession();
    const token = currentSessionToken();
    if (!token || closed) {
      retryTimer = setTimeout(open, (retry = Math.min(30_000, retry * 2)));
      return;
    }
    const url = `${serverUrl().replace(/^http/, 'ws')}/ws`;
    try {
      socket = new WebSocket(url);
    } catch {
      retryTimer = setTimeout(open, (retry = Math.min(30_000, retry * 2)));
      return;
    }
    socket.onopen = () => {
      retry = 1000;
      socket.send(JSON.stringify({ t: 'hello', sessionToken: token, name: name(), avatar: avatar(), room: room() }));
      sentKey = '';
    };
    socket.onmessage = (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      if (message.t === 'welcome') handlers.onWelcome?.(message.id, message.room);
      else if (message.t === 'join') handlers.onJoin(message.players, Boolean(message.existing));
      else if (message.t === 'leave') handlers.onLeave(message.id);
      else if (message.t === 'state') handlers.onState(message.p);
      else if (message.t === 'sticker') handlers.onSticker?.(message.id, message.s);
    };
    socket.onclose = (event) => {
      socket = null;
      handlers.onReset();
      if (closed) return;
      // An expired session: open a new one before trying again.
      if (event.code === 4001) openSession();
      if (again) {
        again = false;
        open();
        return;
      }
      retryTimer = setTimeout(open, (retry = Math.min(30_000, retry * 2)));
    };
  };

  const sender = setInterval(() => {
    if (!pose || socket?.readyState !== WebSocket.OPEN) return;
    const key = pose.map((v) => Math.round(v * 20)).join(',');
    const now = performance.now();
    if (key === sentKey && now - sentAt < KEEP_MS) return;
    sentKey = key;
    sentAt = now;
    socket.send(JSON.stringify({ t: 'move', p: pose }));
  }, SEND_MS);

  open();

  return {
    setPose: (p) => { pose = p; },
    sendSticker: (index) => {
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ t: 'sticker', s: index }));
    },
    restart: () => {
      if (!socket) return;
      again = true;
      socket.close();
    },
    dispose: () => {
      closed = true;
      clearTimeout(retryTimer);
      clearInterval(sender);
      socket?.close();
    },
  };
}
