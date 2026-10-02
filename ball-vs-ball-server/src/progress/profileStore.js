import { mkdirSync, readFileSync } from 'node:fs';
import { rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from '../config/env.js';

// Saved player data: one JSON file, loaded at start and written (debounced, atomically) after changes.
const FILE = join(config.dataDir, 'profiles.json');
const SAVE_DELAY_MS = 2000;

const profiles = new Map();
let saveTimer = null;

try {
  mkdirSync(config.dataDir, { recursive: true });
  for (const [id, profile] of Object.entries(JSON.parse(readFileSync(FILE, 'utf8')))) profiles.set(id, profile);
} catch (error) {
  if (error.code !== 'ENOENT') console.warn('Could not read saved profiles:', error.message);
}

export const getProfile = (guestId) => profiles.get(guestId) ?? null;

export function setProfile(guestId, profile) {
  profiles.set(guestId, profile);
  saveSoon();
}

function saveSoon() {
  if (saveTimer) return;
  saveTimer = setTimeout(flushProfiles, SAVE_DELAY_MS);
  saveTimer.unref();
}

export async function flushProfiles() {
  clearTimeout(saveTimer);
  saveTimer = null;
  try {
    await writeFile(`${FILE}.tmp`, JSON.stringify(Object.fromEntries(profiles)));
    await rename(`${FILE}.tmp`, FILE);
  } catch (error) {
    console.warn('Could not save profiles:', error.message);
  }
}
