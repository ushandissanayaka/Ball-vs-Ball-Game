import { useSyncExternalStore } from 'react';

// The rendered 3D ball pictures (see scene/ballThumbs.js), by ball kind, as they arrive.
const urls = new Map();
const listeners = new Set();

export function setBallThumb(kind, url) {
  urls.set(kind, url);
  listeners.forEach((listener) => listener());
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The 3D picture of `kind`, or null until (unless) it has been rendered. */
export function useBallThumb(kind) {
  return useSyncExternalStore(subscribe, () => urls.get(kind) ?? null);
}
