import { useEffect, useState } from 'react';
import { getGemsCatalog, onUserChanged } from '../../bloxity/sdk.js';

/** The signed-in Bloxity user (or null), kept current through the SDK's one user subscription. */
export function useBloxityUser() {
  const [user, setUser] = useState(null);
  useEffect(() => onUserChanged(setUser), []);
  return user;
}

let prices = null; // Map sku -> price, once read
const waiting = new Set();

/**
 * Gems product `sku`'s price as Bloxity's catalog for this game has it; `fallback` (the price the store was
 * designed with) until the catalog has been read, or if it doesn't list the sku. Bloxity always charges its own.
 */
export function useGemsPrice(sku, fallback) {
  const [, redraw] = useState(0);
  useEffect(() => {
    if (prices) return undefined;
    const update = () => redraw((n) => n + 1);
    waiting.add(update);
    getGemsCatalog().then((catalog) => {
      prices = catalog;
      for (const each of waiting) each();
      waiting.clear();
    });
    return () => waiting.delete(update);
  }, []);
  return prices?.get(sku) ?? fallback;
}

/** A Gems price as text: <GemsPrice sku="gems_100" fallback={99} />. */
export const GemsPrice = ({ sku, fallback }) => useGemsPrice(sku, fallback);
