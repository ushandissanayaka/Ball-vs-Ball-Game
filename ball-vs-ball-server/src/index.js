import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { config, isAllowedOrigin } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { lobbyRouter } from './routes/lobby.js';
import { sessionRouter } from './routes/session.js';
import { flushProfiles } from './progress/profileStore.js';

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: (origin, done) => done(null, isAllowedOrigin(origin)) }));
app.use(express.json({ limit: '16kb' }));

app.use(healthRouter());
app.use(lobbyRouter());
app.use(sessionRouter());
app.use((_request, response) => response.status(404).json({ error: 'Not found' }));

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`Ball vs Ball server listening on http://localhost:${config.port}`);
});
server.on('error', (error) => {
  if (error.code !== 'EADDRINUSE') throw error;
  console.error(
    `Port ${config.port} is already in use: another server (perhaps this one, already running) holds it.\n` +
      `Stop that one, or start this one on another port, e.g. PORT=${config.port + 1} npm run dev ` +
      `(then set VITE_API_URL=http://localhost:${config.port + 1} for the client).`,
  );
  process.exit(1);
});

// Render sends SIGTERM before a deploy or restart: write pending saves first.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, async () => {
    await flushProfiles();
    server.close(() => process.exit(0));
  });
}
