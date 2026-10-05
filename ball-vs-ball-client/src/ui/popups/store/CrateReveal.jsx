import React, { useEffect } from 'react';
import { revealSound } from '../../../audio/sfx.js';
import { KINDS } from '../../../shared/catalog.js';
import { ItemIcon } from '../../icons/ItemArt.jsx';

const RARITY_LABEL = { uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary', mythic: 'Mythic' };

/**
 * What a crate gave: one prize big in a burst of its rarity's colour, or ten in a grid, each card flipping in
 * after the one before. Click anywhere to collect.
 */
export default function CrateReveal({ kind, prizes, onClose }) {
  const single = prizes.length === 1;
  const RANK = ['uncommon', 'rare', 'epic', 'legendary', 'mythic'];
  const best = prizes.map((id) => KINDS[kind].items[id].rarity).sort((a, b) => RANK.indexOf(b) - RANK.indexOf(a))[0];
  useEffect(() => { revealSound(best); }, []);
  return (
    <div className={`crate-reveal ${single ? 'single' : 'multi'}`} onClick={onClose}>
      <div className="reveal-cards">
        {prizes.map((id, i) => {
          const item = KINDS[kind].items[id];
          return (
            <div key={`${id}${i}`} className={`reveal-card ${item.rarity}`} style={{ '--i': i }}>
              <div className="reveal-rays" />
              <ItemIcon kind={kind} id={id} className="reveal-icon" />
              <div className="reveal-name">{item.name}</div>
              <div className="reveal-rarity">{RARITY_LABEL[item.rarity]}</div>
            </div>
          );
        })}
      </div>
      <div className="reveal-hint">Click to collect</div>
    </div>
  );
}
