import { LIMITED_OFFER, nextLimitedOfferEnd } from '../shared/constants.js';

/** The limited-time shop stand: which item it sells and when the offer rotates. */
export function getLimitedOffer(now) {
  return { id: LIMITED_OFFER.id, name: LIMITED_OFFER.name, endsAt: nextLimitedOfferEnd(now) };
}
