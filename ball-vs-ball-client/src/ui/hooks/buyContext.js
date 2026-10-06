import { createContext } from 'react';

/**
 * How the HUD buys a Gems product: buy(item) resolves to { done, gift?, pending? } or { error } (see App.jsx's
 * shop actions). Every payment window uses it, wherever it opens.
 */
export const BuyContext = createContext(async () => ({ error: 'unavailable' }));
