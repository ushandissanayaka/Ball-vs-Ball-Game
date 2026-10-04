import React, { useState } from 'react';
import { formatClock } from '../../shared/constants.js';
import { SEED_TRADE_PLAYERS } from '../../shared/lobbySeed.js';
import { CoinIcon, HandshakeIcon, QuestIcon } from '../icons/Icons.jsx';

/**
 * Top-right: "Daily Quests" / "Trade" tabs: the daily quest list with its reset countdown, or the players to
 * trade with (clicking one sends them a request).
 */
export default function QuestPanel({ quests, resetsAt, now }) {
  const [tab, setTab] = useState('quests');
  const [requested, setRequested] = useState([]); // players sent a trade request (marked on the list)
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
        <div className="trade-panel">
          <div className="trade-requests">
            <span>Trade Requests:</span>
            <span className="trade-requests-slot" />
            <button type="button" className="trade-close" onClick={() => setTab(null)}>CLOSE</button>
          </div>
          <div className="trade-hint">Click on a player to trade</div>
          <div className="trade-header"><span>Player Name</span><span>Lv</span></div>
          <div className="trade-list">
            {SEED_TRADE_PLAYERS.map((player) => (
              <button
                type="button"
                key={player.name}
                className={`trade-row ${requested.includes(player.name) ? 'requested' : ''}`}
                onClick={() => setRequested((list) => (list.includes(player.name) ? list : [...list, player.name]))}
              >
                <span className="trade-name">{player.name}</span>
                <span className="trade-streak">{player.streak > 0 && <>🔥<b>{player.streak}</b></>}</span>
                <span className="trade-level">{player.level}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
