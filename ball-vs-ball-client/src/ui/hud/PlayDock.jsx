import React, { useState } from 'react';
import { BALLS } from '../../shared/balls.js';
import { UNLOCK_EVERY, WINS_PER_LEVEL, tierHp, unlockedAt } from '../../shared/levels.js';
import BallIcon from '../icons/BallIcon.jsx';

/** The level ring: fills a third for each duel won toward the next level. */
function LevelRing({ className, into }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="27" fill="#14353d" />
      <circle cx="32" cy="32" r={r} fill="none" stroke="#2a5560" strokeWidth="9" />
      <circle cx="32" cy="32" r={r} fill="none" stroke="#3fd6c8" strokeWidth="9" strokeLinecap="round"
        strokeDasharray={`${(c * into) / WINS_PER_LEVEL} ${c}`} transform="rotate(-90 32 32)" />
      <circle cx="32" cy="32" r="13" fill="#effcff" stroke="#9cf3ff" strokeWidth="2.5" />
    </svg>
  );
}

/**
 * Bottom-centre: the player's level (completed levels) with a ring showing the wins toward the next, and the big
 * green Play button. Clicking the level opens what the next level and the next ball unlock bring.
 */
export default function PlayDock({ level, into }) {
  const [open, setOpen] = useState(false);
  const nextUnlock = (Math.floor(level / UNLOCK_EVERY) + 1) * UNLOCK_EVERY;
  const coming = unlockedAt(nextUnlock);
  return (
    <section className="play-dock">
      {open && (
        <div className="level-card">
          <div className="level-card-title outlined">Level {level}</div>
          <div className="level-card-wins">{into}/{WINS_PER_LEVEL} wins to Level {level + 1}</div>
          <div className="level-card-pips">
            {Array.from({ length: WINS_PER_LEVEL }, (_, i) => <span key={i} className={`level-pip ${i < into ? 'won' : ''}`} />)}
          </div>
          {coming.length > 0 && (
            <>
              <div className="level-card-next">Unlocks at Level {nextUnlock}:</div>
              <div className="level-card-balls">
                {coming.map((ball) => (
                  <div key={ball} className="level-card-ball">
                    <BallIcon kind={ball} className="level-card-icon" />
                    <span>{BALLS[ball].name}</span>
                    <b>{tierHp(ball)} HP</b>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <button type="button" className="level-reward" onClick={() => setOpen((o) => !o)}>
        <span className="outlined">Lv {level}</span>
        <span className="level-wins outlined">{into}/{WINS_PER_LEVEL}</span>
        <LevelRing className="level-ring" into={into} />
      </button>
      <button type="button" className="play-button outlined">Play</button>
    </section>
  );
}
