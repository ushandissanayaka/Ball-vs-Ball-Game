# Ball vs Ball

A ball-fighting game for the Bloxity Legion platform. This first slice is the **lobby**: a glassy neon platform over the sea under a cloudy sky, with its stations, leaderboards, duel arenas and HUD, and no characters or gameplay yet. The client (Vite + React + Three.js) lives in `ball-vs-ball-client/` and deploys to Netlify; the server (Node + Express) lives in `ball-vs-ball-server/` and deploys to Render; each has its own `package.json` so they deploy independently.

## Run locally

```bash
cd ball-vs-ball-server && npm install && npm run dev    # http://localhost:2568
cd ball-vs-ball-client && npm install && npm run dev    # http://localhost:5173
```

The client finds the server on port 2568 of the same host, and falls back to sample data if the server is offline, so the lobby always looks complete. Drag to orbit the camera, scroll or pinch to zoom, right-drag or two-finger drag to pan, and WASD or arrow keys to glide; add `?quality=Low|Medium|High|Ultra` to the URL to force a graphics level.

## Deploy

For Netlify, set Base directory to `ball-vs-ball-client` and set `VITE_API_URL` to the server's Render URL. For Render, use the Blueprint at `ball-vs-ball-server/render.yaml` (or a Web Service with Root Directory `ball-vs-ball-server`, Build `npm ci --omit=dev`, Start `npm start`) and set `CLIENT_ORIGIN` to the Netlify URL. Render's free disk is wiped on every restart, so attach a disk and point `DATA_DIR` at it if you want saved guest profiles to persist.

## Shared code

Both apps keep an identical copy of the game rules, routes and sample data in their own `src/shared/`; when you change one copy, change the other the same way.
