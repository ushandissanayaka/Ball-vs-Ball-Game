import React, { useState } from 'react';
import { formatClock } from '../../shared/constants.js';
import { CoinIcon, HandshakeIcon, QuestIcon } from '../icons/Icons.jsx';

/** Top-right: "Daily Quests" / "Trade" tabs and the daily quest list with its reset countdown. */
export default function QuestPanel({ quests, resetsAt, now }) {
  const [tab, setTab] = useState('quests');
  // Clicking the open tab again folds the panel away.
  const choose = (next) => setTab((current) => (current === next ? null : next));
  return (
    <section className="quest-panel">
      <div className="tabs">
        <button type="button" className={`tab tab-quests ${tab === 'quests' ? 'active' : ''}`} onClick={() => choose('quests')}>
          <QuestIcon className="tab-icon" />
          <span>Daily Quests</span>
        </button>
        <button type="button" className={`tab tab-trade ${tab === 'trade' ? 'active' : ''}`} onClick={() => choose('trade')}>
          <HandshakeIcon className="tab-icon tab-icon-wide" />
          <span>Trade</span>
        </button>
      </div>
      {tab === 'quests' && (
        <div className="panel">
          <h2 className="panel-title outlined">Daily Quests ({formatClock(resetsAt - now)})</h2>
          {quests.map((quest) => (
            <div className="quest" key={quest.id}>
              <div className="quest-body">
                <div className="quest-title">{quest.title}</div>
                <div className="quest-meta">
                  <span className="quest-progress outlined">{quest.progress}/{quest.goal}</span>
                  <span className="quest-reward">
                    <CoinIcon className="quest-coin" />
                    <span className="outlined">X{quest.reward}</span>
                  </span>
                </div>
              </div>
              <button type="button" className={`quest-state ${quest.done ? 'done' : ''}`} disabled={!quest.done}>
                {quest.done ? 'Claim' : 'Undone'}
              </button>
            </div>
          ))}
        </div>
      )}
      {tab === 'trade' && (
        <div className="panel">
          <h2 className="panel-title outlined">Trade</h2>
          <p className="panel-note">No trade requests yet.</p>
        </div>
      )}
    </section>
  );
}
