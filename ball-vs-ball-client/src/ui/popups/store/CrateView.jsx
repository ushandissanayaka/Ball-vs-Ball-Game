import React from 'react';
import { KINDS, ORDER } from '../../../shared/catalog.js';
import { CRATES } from '../../../shared/rewards.js';
import { CoinIcon, GemIcon } from '../../icons/Icons.jsx';
import { GachaMachineArt, ItemIcon, ToyBoxArt, TvCrateArt, TradeIcon } from '../../icons/ItemArt.jsx';

const RARITY_LABEL = { uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };
const ART = { ball: GachaMachineArt, explosion: TvCrateArt, flyer: ToyBoxArt };

const percent = (value) => `${value.toFixed(2)}%`;

/** Everything a crate can give (no mythics), best first. */
export const prizesOf = (crate) => ORDER[crate.kind].filter((id) => KINDS[crate.kind].items[id].rarity in crate.odds);

/** The same prizes dealt out one rarity after another (epic, rare, legendary, ...), so the strip shows a mix. */
function mixed(crate) {
  const piles = Object.keys(crate.odds).map((rarity) => prizesOf(crate).filter((id) => KINDS[crate.kind].items[id].rarity === rarity));
  const out = [];
  for (let i = 0; out.length < prizesOf(crate).length; i += 1) piles.forEach((pile) => { if (pile[i]) out.push(pile[i]); });
  return out;
}

/** A tile in a prize strip or list: the item's picture over its name, framed in its rarity's colour. */
export function PrizeTile({ kind, id }) {
  const item = KINDS[kind].items[id];
  return (
    <div className={`prize-tile ${item.rarity}`}>
      <div className="prize-tile-art"><ItemIcon kind={kind} id={id} className="prize-tile-icon" /></div>
      <div className={`prize-tile-name ${item.name.length > 13 ? 'small' : ''}`}>{item.name}</div>
    </div>
  );
}

function CrateCard({ crateId, wallet, onOpen, onViewAll, onMore }) {
  const crate = CRATES[crateId];
  const Art = ART[crate.kind];
  const diamond = crate.currency === 'gems';
  const prizes = mixed(crate);
  const Currency = diamond ? GemIcon : CoinIcon;
  const button = (count) => {
    const cost = crate.price * count;
    const affordable = wallet[crate.currency] >= cost;
    return (
      <button type="button" className={`crate-open ${affordable && !diamond ? 'ready' : ''}`} onClick={() => onOpen(crateId, count)}>
        <span className="crate-open-label">Open {count}</span>
        <span className="crate-open-price"><span className="outlined">{cost}</span><Currency className="crate-open-icon" /></span>
      </button>
    );
  };
  return (
    <div className={`crate-card ${diamond ? 'diamond' : 'coins'}`}>
      <div className="crate-head">
        <Currency className="crate-head-icon" />
        <h3 className={`crate-title ${crate.name.length > 19 ? 'long' : ''}`}>{crate.name}</h3>
        {crate.tradable && <span className="crate-tradable"><TradeIcon className="crate-trade-icon" />Tradable</span>}
      </div>
      <div className="crate-art"><Art className="crate-art-icon" diamond={diamond} /></div>
      <dl className="crate-odds">
        {Object.entries(crate.odds).map(([rarity, chance]) => (
          <React.Fragment key={rarity}>
            <dt className={rarity}>{RARITY_LABEL[rarity]}:</dt><dd>{percent(chance)}</dd>
          </React.Fragment>
        ))}
      </dl>
      <div className="crate-preview-head">
        <span>Prize Preview</span>
        <button type="button" className="crate-view-all" onClick={() => onViewAll(crateId)}>View All &gt;</button>
      </div>
      <div className="crate-strip">
        {/* The prizes roll by on their own; two copies make the loop seamless. */}
        <div className="crate-strip-track" style={{ '--count': prizes.length }}>
          {[...prizes, ...prizes].map((id, i) => <PrizeTile key={`${id}${i}`} kind={crate.kind} id={id} />)}
        </div>
      </div>
      <div className="crate-buttons">
        {button(1)}
        {button(10)}
        {diamond && <button type="button" className="crate-more" aria-label="Get diamonds" onClick={onMore}><span className="outlined">&gt;</span></button>}
      </div>
    </div>
  );
}

/** A store tab's two crates (coins and diamonds) for `kind`. */
export default function CrateView({ kind, wallet, onOpen, onViewAll, onMore }) {
  return (
    <div className={`crate-view ${kind}`}>
      {kind === 'ball' && <button type="button" className="crate-help" aria-label="About crates"><span className="outlined">?</span></button>}
      <CrateCard crateId={`${kind}_coins`} wallet={wallet} onOpen={onOpen} onViewAll={onViewAll} onMore={onMore} />
      <CrateCard crateId={`${kind}_gems`} wallet={wallet} onOpen={onOpen} onViewAll={onViewAll} onMore={onMore} />
    </div>
  );
}
