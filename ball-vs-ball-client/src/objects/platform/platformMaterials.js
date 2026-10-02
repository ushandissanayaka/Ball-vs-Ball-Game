import { PLATFORM } from '../../config/palette.js';
import { standard } from '../../util/materials.js';

/** How much of the sea (and the shadows on it) shows through the glass deck: 1 = solid, lower = clearer. */
export const DECK_OPACITY = 0.8;

/**
 * The glassy blue deck: slightly see-through, so the sea and the shadows below show faintly through it, with a
 * soft sheen of sky reflection and no hard sun glare spot.
 */
export const glassDeck = () => standard(PLATFORM.glass, {
  roughness: 0.32, metalness: 0.1, envMapIntensity: 0.55, transparent: true, opacity: DECK_OPACITY,
});
export const platformSide = () => standard(PLATFORM.side, { roughness: 0.55 });
export const insetLine = () => standard(PLATFORM.insetLine, { roughness: 0.3, emissive: PLATFORM.insetLine, emissiveIntensity: 0.3 });

/**
 * Box materials in three.js face order (+x, -x, +y, -y, +z, -z): glass on top and underneath (so the deck can be
 * seen through), dark navy on the thin side edges.
 */
export const deckFaces = () => [platformSide(), platformSide(), glassDeck(), glassDeck(), platformSide(), platformSide()];
