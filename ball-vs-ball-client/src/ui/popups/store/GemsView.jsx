import React from 'react';
import { formatClock, nextDailyReset, utcDayKey } from '../../../shared/constants.js';
import { DAILY_GEMS, GEM_PACKS } from '../../../shared/rewards.js';
import { GemIcon } from '../../icons/Icons.jsx';
import { BuxMark } from '../../icons/PopupIcons.jsx';
import { GemPackArt, GiftIcon } from '../../icons/ItemArt.jsx';

const TONE = ['blue', 'blue', 'blue', 'lavender', 'lavender', 'purple'];

/** The diamond packs (the store's "+"), and the free Daily Diamonds under them. */
export default function GemsView({ gemsDay, now, onBuy, onGift, onClaimDaily }) {
  const claimed = gemsDay === utcDayKey(now);
  return (
    <div className="gems-view">
      <div className="gem-packs">
        {GEM_PACKS.map((pack, i) => (
          <div key={pack.gems} className={`gem-pack ${TONE[i]}`}>
            <button type="button" className="gem-pack-gift" aria-label={`Gift ${pack.gems} diamonds`} onClick={() => onGift(pack)}>
              <GiftIcon className="gem-pack-gift-icon" />
            </button>
            <div className="gem-pack-amount">{pack.gems}</div>
            {pack.bonus && <div className="gem-pack-bonus">+{pack.bonus}%</div>}
            <GemPackArt className="gem-pack-art" tier={i} />
            <button type="button" className="gem-pack-buy" onClick={() => onBuy(pack)}>
              <BuxMark className="gem-pack-bux" /><span>{pack.bux}</span>
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="daily-gems" onClick={onClaimDaily} disabled={claimed}>
        <GemIcon className="daily-gems-icon" />
        <span className="daily-gems-title">Daily Diamonds</span>
        <span className="daily-gems-claim">
          {claimed ? `Next in ${formatClock(nextDailyReset(now) - now)}` : <>Claim <b>{DAILY_GEMS}</b></>}
        </span>
      </button>
    </div>
  );
}
