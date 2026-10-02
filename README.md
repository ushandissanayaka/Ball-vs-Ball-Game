# Ball vs Ball

A ball-fighting game for the Bloxity Legion platform. This first slice is the **lobby**: a glassy neon platform over the sea under a cloudy sky, with its stations, leaderboards, duel arenas and HUD. There are no characters or gameplay yet.

The client and the server are separate apps, each with its own `package.json`, `.gitignore` and env example, so each one deploys alone:

| App | Host | Folder |
| --- | --- | --- |
| Client (Vite + React + Three.js) | Netlify | `ball-vs-ball-client/` |
| Server (Node + Express) | Render | `ball-vs-ball-server/` |

## Run locally

```bash
cd ball-vs-ball-server && npm install && npm run dev    # http://localhost:2568
cd ball-vs-ball-client && npm install && npm run dev    # http://localhost:5173
```

The client finds the server on port 2568 of the same host (not 2567, which the other Legion game uses). If the server is offline, the client shows the sample data in `shared/lobbySeed.js` instead, so the lobby always looks complete.

Camera: drag to orbit, scroll or pinch to zoom, right-drag or two-finger drag to pan, WASD or arrow keys to glide. Add `?quality=Low|Medium|High|Ultra` to force a graphics level, or `?cam=x,y,z,tx,ty,tz` to open on a specific view.

## Deploy

**Netlify (client):** set Base directory to `ball-vs-ball-client`. `netlify.toml` provides the build command (`npm run build`), the publish folder (`dist`) and cache headers. Set `VITE_API_URL` to the Render URL, for example `https://ball-vs-ball-server.onrender.com`. Vite bakes this value in at build time, so redeploy after you change it.

**Render (server):** create a Blueprint with path `ball-vs-ball-server/render.yaml`, or a Web Service with Root Directory `ball-vs-ball-server`, Build `npm ci --omit=dev`, Start `npm start`, Health check `/health`. Set `CLIENT_ORIGIN` to the Netlify URL; you can add more origins separated by commas, and `https://*--yoursite.netlify.app` covers deploy previews. Render's free disk is wiped on every restart, so saved guest profiles are lost unless you attach a disk and point `DATA_DIR` at it.

## Shared code

The client and the server each keep a copy of the code they both rely on in `src/shared/`: `constants.js` (rules, API routes, arena ids, quests, reset times, time formatting), `lobbySeed.js` (sample leaderboards and the starting profile) and `types.js` (the shapes of the data the server sends). Each host builds only its own folder, so the two copies must stay the same. When you change one, change the other in the same way.

## Folder structure

```
Ball-vs-Ball-Game/
│
├── ball-vs-ball-client/        FRONTEND (Netlify)
│   ├── index.html              Page shell, fonts, Legion SDK script, plain-HTML loading screen
│   ├── netlify.toml            Netlify build and cache settings
│   ├── vite.config.js          Build config (three.js in its own long-cached chunk)
│   ├── public/                 Files served as-is (favicon)
│   └── src/
│       ├── App.jsx, main.jsx   Startup: build the world, fetch data, show the HUD
│       ├── bloxity/            Legion SDK wrapper: init, loading and gameplay lifecycle, settings
│       ├── config/             Client constants: palette (colours), layout (positions and sizes), graphics presets
│       ├── controls/           Camera controls (orbit, zoom, pan, WASD)
│       ├── effects/            Visual effects: neon edges, glow textures, projector beam, sparkles, bloom
│       ├── objects/            Game objects and their client-side behaviour
│       │   ├── environment/    Sky (painted clouds), 3D cloud cards, sea
│       │   ├── platform/       Hub deck, neck, runway lane with chevrons
│       │   └── props/          Leaderboards, 2V2 portal, Flyers, Explosions, Balls machines,
│       │                       limited shop, duel arenas, pedestals, mascot balls
│       ├── scene/              Assembles the world: renderer, lighting, lobby build, render loop
│       ├── net/                Server API calls, with offline fallbacks
│       ├── ui/                 User interface
│       │   ├── screens/        Whole screens (lobby HUD, loading screen)
│       │   ├── hud/            HUD pieces: quests and trade, quick join, side menu, wallet, play dock
│       │   ├── icons/          Inline SVG icons
│       │   ├── hooks/          React hooks (ticking clock)
│       │   └── styles/         HUD CSS
│       ├── assets/
│       │   ├── images/         Image and texture files (none yet; everything is generated in code)
│       │   └── audio/          Sound and music files for client-side audio
│       ├── util/               Helpers: materials, meshes, canvas text, static batching, seeded random
│       └── shared/             Rules and data the server uses too (keep in step with the server copy)
│
└── ball-vs-ball-server/        BACKEND (Render)
    ├── render.yaml             Render Blueprint
    ├── data/                   Saved profiles (written at runtime, git-ignored)
    └── src/
        ├── index.js            Express app, CORS, routes, graceful shutdown
        ├── config/             Environment settings (port, allowed origins, data dir)
        ├── routes/             HTTP endpoints: /health, /api/lobby, /api/session
        ├── gameplay/           Server-side game rules (for now, the lobby snapshot)
        ├── players/            Player and session management: guest profiles, session tokens
        ├── objects/            Server-owned object state: duel arenas (players waiting), limited-offer rotation
        ├── progress/           Leaderboards, daily quests, rewards, saved data storage
        └── shared/             Rules and data the client uses too (keep in step with the client copy)
```

## Performance notes

- Only the sea moves: two ripple layers drift in the sea's shader, which adds just two texture reads per pixel. While the camera is still, the picture is redrawn only as often as the water needs: 24 fps on Medium, 30 on High, 60 on Ultra, and frozen on Low. Camera moves draw at full rate.
- Static meshes are merged per material (`util/staticBatch.js`), and all neon is merged per colour, so the whole lobby takes a few dozen draw calls.
- The sky, clouds, sea ripples and screens are generated in code at startup, so there are no image downloads. The full build is about 210 kB gzipped.
- The deck floats 75 units above the sea on hanging support blocks. The sun is high and slightly east, so the deck, blocks and mascots cast soft shadows onto the water. Nothing that casts a shadow moves, so the shadow map is drawn once rather than every frame. Its resolution is 1024 on Low, 2048 on Medium and High, and 4096 on Ultra. Bloom is used on High and Ultra only; phones default to Medium (or Low on devices with little memory). The Bloxity portal's `graphics_quality` setting switches presets live.
