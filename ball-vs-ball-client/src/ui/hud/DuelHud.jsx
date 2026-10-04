import React, { useEffect, useRef, useState } from 'react';
import { BALLS, BALL_IDS } from '../../shared/balls.js';
import BallIcon from '../icons/BallIcon.jsx';
import { CoinIcon, GemIcon, HeartIcon, RefreshIcon } from '../icons/Icons.jsx';
import QueuePanel from './QueuePanel.jsx';

/** A player's picture (an ImageBitmap of their character's head and shoulders), drawn into a canvas. */
function Portrait({ picture }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !picture) return;
    canvas.width = picture.width;
    canvas.height = picture.height;
    canvas.getContext('2d').drawImage(picture, 0, 0);
  }, [picture]);
  return picture ? <canvas ref={ref} className="badge-portrait" /> : null;
}

/** A player's corner of the duel screen: round picture, name, hearts, and the ball they fight with. */
function PlayerBadge({ side, player }) {
  if (!player) return null;
  return (
    <section className={`badge badge-${side}`}>
      <div className="badge-top">
        <div className="badge-avatar"><Portrait picture={player.picture} /></div>
        <div className="badge-info">
          <div className="badge-name">{player.name}</div>
          <div className="badge-hearts">
            {Array.from({ length: player.hearts }, (_, i) => <HeartIcon key={i} className="badge-heart" />)}
          </div>
        </div>
      </div>
      <div className="badge-ball">
        {player.ball && <div className="badge-ball-name outlined">{BALLS[player.ball].name}</div>}
        <BallIcon kind={player.ball ?? 'unknown'} className="badge-ball-icon" />
      </div>
    </section>
  );
}

/**
 * "Select Any Ball": every ball as a tile framed in its rarity's colour. Point at a tile to light it up, click
 * to select it (double-click picks it straight away), scroll the wheel if they don't all fit; YES picks the
 * selected ball, NO (or Escape) closes the window.
 */
function AllBallsPanel({ secondsLeft, current, onPick, onClose }) {
  const [selected, setSelected] = useState(current);
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Enter' && selected) onPick(selected);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, onPick, onClose]);
  return (
    <section className="all-balls-panel" role="dialog" aria-label="Select any ball">
      <h2 className="all-balls-title">Select Any Ball - {secondsLeft}</h2>
      <div className="all-balls-grid">
        {BALL_IDS.map((id) => (
          <button
            type="button"
            key={id}
            className={`ball-tile ${BALLS[id].rarity}${selected === id ? ' selected' : ''}`}
            title={BALLS[id].blurb}
            onClick={() => setSelected(id)}
            onDoubleClick={() => onPick(id)}
          >
            <span className="ball-tile-art"><BallIcon kind={id} className="ball-tile-icon" /></span>
            <span className="ball-tile-name">{BALLS[id].name}</span>
          </button>
        ))}
      </div>
      <div className="all-balls-buttons">
        <button type="button" className="all-balls-no outlined" onClick={onClose}>NO</button>
        <button type="button" className="all-balls-yes outlined" disabled={!selected} onClick={() => onPick(selected)}>YES</button>
      </div>
    </section>
  );
}

function ChoosePanel({ duel, gems, actions }) {
  const [showAll, setShowAll] = useState(false);
  const canReroll = !duel.chosen && !duel.local && gems >= duel.rerollCost;
  const pick = (id) => {
    actions.choose(id);
    setShowAll(false);
  };
  return (
    <>
      <div className="duel-dim" />
      {showAll ? (
        <AllBallsPanel secondsLeft={duel.secondsLeft} current={duel.chosen} onPick={pick} onClose={() => setShowAll(false)} />
      ) : (
        <>
          <h2 className="choose-title">CHOOSE YOUR BALL - {duel.secondsLeft}</h2>
          <section className="choose-cards">
            {duel.offers.map((id) => (
              <button type="button" key={id} className={`ball-card${duel.chosen === id ? ' picked' : ''}`} onClick={() => actions.choose(id)}>
                <span className="ball-card-name">{BALLS[id].name}</span>
                <span className="ball-card-art"><BallIcon kind={id} className="ball-card-icon" /></span>
                <span className="ball-card-blurb">{BALLS[id].blurb}</span>
              </button>
            ))}
          </section>
          {duel.chosen && <div className="duel-wait outlined">Waiting for opponent...</div>}
          <section className="choose-actions">
            <button type="button" className="all-balls" onClick={() => setShowAll(true)}>
              <span className="choose-tag free outlined">Free</span>
              <span className="outlined">All Balls</span>
            </button>
            <button type="button" className="reroll" disabled={!canReroll} onClick={actions.reroll}>
              <span className="choose-tag gem outlined"><GemIcon className="reroll-gem" />{duel.rerollCost}</span>
              <RefreshIcon className="reroll-icon" />
              <span className="reroll-label outlined">Reroll</span>
            </button>
          </section>
        </>
      )}
    </>
  );
}

function AimPanel({ duel, actions }) {
  const opponent = duel.players[duel.you === 'pink' ? 'blue' : 'pink'];
  return (
    <>
      <h2 className="aim-title outlined">ADJUST YOUR AIM - {duel.secondsLeft}</h2>
      {!duel.locked && <div className="aim-hint outlined">Drag on the box (or A / D) to aim</div>}
      {duel.locked && !opponent?.locked && <div className="duel-wait aim-wait outlined">Waiting for opponent...</div>}
      <section className="aim-dock">
        <button type="button" className="lock-aim outlined" disabled={duel.locked} onClick={actions.lockAim}>
          {duel.locked ? 'Locked' : 'Lock Aim'}
        </button>
      </section>
    </>
  );
}

function ResultBanner({ result }) {
  const sub = result.won
    ? result.endedBy === 'forfeit' ? 'Your opponent left' : 'You won the duel!'
    : 'Better luck next time';
  return (
    <div className={`duel-result ${result.won ? 'won' : 'lost'}`}>
      <div className="duel-result-title outlined">{result.won ? 'VICTORY!' : 'DEFEAT'}</div>
      <div className="duel-result-sub outlined">{sub}</div>
      {result.won && (
        <div className="duel-result-reward outlined">+{result.reward}<CoinIcon className="duel-result-coin" /></div>
      )}
    </div>
  );
}

/**
 * Everything on screen while the player is on a duel square: both players' badges, then by phase the
 * Invite / Leave buttons, the ball cards, the aim controls, the FIGHT! call and the result.
 */
export default function DuelHud({ duel, gems, actions }) {
  const { phase } = duel;
  return (
    <>
      <PlayerBadge side="pink" player={duel.players.pink} />
      <PlayerBadge side="blue" player={duel.players.blue} />
      {(phase === 'waiting' || phase === 'intro') && <QueuePanel onLeave={actions.leave} waiting={phase === 'waiting'} />}
      {phase === 'choose' && <ChoosePanel duel={duel} gems={gems} actions={actions} />}
      {phase === 'aim' && <AimPanel duel={duel} actions={actions} />}
      {duel.fightBanner && <div className="fight-banner outlined">FIGHT!</div>}
      {duel.result && <ResultBanner result={duel.result} />}
    </>
  );
}

/** "E Join", floating over the arena square the character stands on. Tap it on touch screens. */
export function JoinPrompt({ at, onJoin }) {
  const [touch, setTouch] = useState(false);
  useEffect(() => setTouch(Boolean(window.matchMedia?.('(pointer: coarse)').matches)), []);
  return (
    <button type="button" className="join-prompt" style={{ left: at.x, top: at.y }} onClick={onJoin}>
      {!touch && <span className="join-key">E</span>}
      <span className="join-label">Join</span>
    </button>
  );
}
