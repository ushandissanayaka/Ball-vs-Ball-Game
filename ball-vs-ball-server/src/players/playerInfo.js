import { cleanEquipped, cleanProportions, isTrustedSkinUrl } from '../shared/avatar.js';

// What other players are shown of a player: a name, and their Bloxity avatar (the items worn, the body's
// proportions, and the skin texture, which only Bloxity's own hosts may supply).

/**
 * A player's name and avatar from a request body (cleaned up), as other players are shown them. A signed-in
 * Bloxity `account` (as Bloxity vouched for it) gives the name; a guest's comes from the body.
 */
export function playerInfo(body, account = null) {
  const name = String(account?.name ?? body?.name ?? '').replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 20) || 'Player';
  const avatar = body?.avatar;
  // Older clients sent only { skinUrl, skinId }.
  const equipped = cleanEquipped(avatar?.equipped ?? { skinId: avatar?.skinId });
  return {
    name,
    avatar: {
      skinUrl: isTrustedSkinUrl(avatar?.skinUrl) ? avatar.skinUrl : undefined,
      equipped,
      proportions: cleanProportions(avatar?.proportions),
    },
  };
}
