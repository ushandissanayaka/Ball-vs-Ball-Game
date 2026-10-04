import React from 'react';
import { DAILY_REWARDS } from '../../shared/rewards.js';
import { CATALOG } from '../../shared/catalog.js';
import BallIcon from '../icons/BallIcon.jsx';
import { CheckIcon, CoinStackIcon, LockIcon } from '../icons/PopupIcons.jsx';
import CloseButton from './CloseButton.jsx';

/**
 * The 7-day reward track (opens when the game starts): days 1-6 in two rows, the big day-7 card on the right.
 * A day is claimed, claimable (unlocked), or locked; the first locked day says it unlocks tomorrow.
 */
export default function DailyRewards({ daily, onClaim, onClose }) {
  const claimedCount = daily.claimed.length;
  const card = (reward, index) => {
    const day = index + 1;
    const claimed = daily.claimed.includes(day);
    const open = !claimed && day <= daily.unlocked;
    const tomorrow = !claimed && day === daily.unlocked + 1;
    const label = reward.coins ? `${reward.coins} Coins` : CATALOG[reward.ball]?.name;
    const kind = day === DAILY_REWARDS.length ? 'grand' : claimed ? 'claimed' : reward.ball ? 'ball' : 'coins';
    return (
      <div key={day} className={`reward-card ${kind}`}>
        <div className="reward-day">Day {day}</div>
        <div className="reward-art">
          {reward.coins ? <CoinStackIcon className="reward-icon" big={reward.coins > 100} claimed={claimed} /> : <BallIcon kind={reward.ball} className="reward-icon" />}
          {claimed && <CheckIcon className="reward-check" />}
        </div>
        <div className="reward-label">{label}</div>
        {claimed && <div className="reward-claimed">Claimed</div>}
        {open && <button type="button" className="reward-claim" onClick={() => onClaim(day)}>Claim</button>}
        {tomorrow && (
          <div className="reward-tomorrow"><LockIcon className="reward-tomorrow-lock" /><span>Unlocks Tomorrow</span></div>
        )}
        {!claimed && !open && !tomorrow && <LockIcon className="reward-lock" />}
      </div>
    );
  };
  return (
    <section className="popup daily-popup" aria-label="Daily Rewards">
      <h2 className="daily-title">Daily Rewards</h2>
      <CloseButton className="daily-close" onClose={onClose} />
      <div className="daily-progress">
        <span className="daily-count">{claimedCount}/{DAILY_REWARDS.length}</span>
        {DAILY_REWARDS.map((_, i) => <span key={i} className={`daily-step ${i < claimedCount ? 'done' : ''}`} />)}
      </div>
      <div className="daily-grid">{DAILY_REWARDS.map(card)}</div>
    </section>
  );
}
