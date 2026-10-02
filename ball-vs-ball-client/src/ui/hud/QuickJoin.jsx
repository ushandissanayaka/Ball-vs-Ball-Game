import React from 'react';
import { CoinIcon, SlotIcon } from '../icons/Icons.jsx';

/** Under the quests: arenas where someone is waiting for an opponent. Hidden when there are none. */
export default function QuickJoin({ entries }) {
  if (!entries.length) return null;
  return (
    <section className="quick-join">
      <h2 className="quick-join-title outlined">Quick Join</h2>
      <div className="panel quick-join-list">
        {entries.map((entry) => (
          <div className="quick-join-entry" key={entry.arenaId}>
            <SlotIcon className="slot" filled={false} />
            <SlotIcon className="slot" filled={entry.players > 0} />
            <span className="quick-join-reward">
              <CoinIcon className="quick-join-coin" />
              Win {entry.reward}
            </span>
            <button type="button" className="join-button outlined">Join</button>
          </div>
        ))}
      </div>
    </section>
  );
}
