import React, { useEffect, useState } from 'react';
import { KINDS, ORDER } from '../../shared/catalog.js';
import { FUSE_COST, fuseStep, ownedCount, variantsOf } from '../../shared/rewards.js';
import { ItemIcon } from '../icons/ItemArt.jsx';
import { FusionIcon, HornBallIcon, SplashIcon, UfoIcon } from '../icons/PopupIcons.jsx';
import CloseButton from './CloseButton.jsx';

const TABS = [
  { id: 'balls', kind: 'ball', label: 'Balls', Icon: HornBallIcon, icon: 'horn' },
  { id: 'explosions', kind: 'explosion', label: 'Explosions', Icon: SplashIcon, icon: 'splash' },
  { id: 'flyers', kind: 'flyer', label: 'Flyers', Icon: UfoIcon, icon: 'ufo' },
  { id: 'fusion', label: 'Fusion', Icon: FusionIcon, icon: 'fusion', isNew: true },
];
const NOUN = { ball: 'Ball', explosion: 'Explosion', flyer: 'Flyer' };
const RARITY_LABEL = { mythic: 'Mythic', legendary: 'Legendary', epic: 'Epic', rare: 'Rare', uncommon: 'Uncommon' };
const VARIANT_LABEL = { classic: '', shiny: 'Shiny ', rainbow: 'Rainbow ' };

/** The overlaid names shrink to fit their tile, as the reference's do; two long ones wrap onto two lines. */
const WRAPPED = new Set(['twin_blades', 'digital_bombardment']);
const nameSize = (id, name) => (WRAPPED.has(id) ? 15 : Math.max(15, Math.min(30, 300 / name.length)));

/** A Balls tile: the picture over a name bar with the count. */
function BallTile({ id, count, selected, onSelect }) {
  const item = KINDS.ball.items[id];
  return (
    <button type="button" className={`inv-tile ${item.rarity} ${count ? 'owned' : 'unowned'} ${selected ? 'selected' : ''}`} onClick={() => onSelect(id)}>
      <span className="inv-tile-art"><ItemIcon kind="ball" id={id} className="inv-tile-icon" /></span>
      <span className={`inv-tile-name ${item.small ? 'small' : ''}`}>
        <span>{item.name}</span>
        {count > 0 && <span>x{count}</span>}
      </span>
    </button>
  );
}

/** An Explosions or Flyers tile: the picture filling it, its name laid over the bottom-left corner. */
function ArtTile({ kind, id, count, selected, onSelect }) {
  const item = KINDS[kind].items[id];
  return (
    <button type="button" className={`inv-tile art ${item.rarity} ${selected ? 'selected' : ''}`} onClick={() => onSelect(id)}>
      <ItemIcon kind={kind} id={id} className="inv-art-icon" />
      <span className={`inv-art-name ${WRAPPED.has(id) ? 'wrap' : ''}`} style={{ '--fs': nameSize(id, item.name) }}>{item.name}</span>
      {count > 0 && <span className="inv-art-count">x{count}</span>}
    </button>
  );
}

/** One tab's things: those owned, then the rest (by rarity), and the chosen one's details. */
function Collection({ kind, profile }) {
  const order = ORDER[kind];
  const count = (id) => ownedCount(profile, kind, id);
  const owned = order.filter((id) => count(id) > 0);
  const unowned = order.filter((id) => !(count(id) > 0));
  const [selected, setSelected] = useState(owned[0] ?? order[0]);
  const item = KINDS[kind].items[selected];
  const total = count(selected);
  const variants = variantsOf(profile, kind, selected);
  const classic = total - variants.shiny - variants.rainbow;
  const Tile = kind === 'ball' ? BallTile : ArtTile;
  const tile = (id) => <Tile key={id} kind={kind} id={id} count={count(id)} selected={id === selected} onSelect={setSelected} />;
  const simple = kind !== 'ball';
  return (
    <>
      <div className="inv-scroll">
        <div className="inv-grid">{owned.map(tile)}</div>
        {unowned.length > 0 && <h3 className="inv-unowned outlined">Unowned</h3>}
        <div className="inv-grid">{unowned.map(tile)}</div>
      </div>
      <aside className={`inv-details ${simple ? 'simple' : ''}`}>
        <div className={`inv-details-name ${item.name.length > 14 ? 'small' : ''}`}>{item.name}</div>
        <ItemIcon kind={kind} id={selected} className="inv-details-icon" />
        {simple ? (
          <>
            <div className={`inv-details-rarity ${item.rarity}`}>{RARITY_LABEL[item.rarity]}</div>
            {total > 0 && (
              <>
                <div className="inv-owned">Owned: {total}</div>
                <dl className="inv-variants">
                  <dt>Classic</dt><dd>{classic}</dd>
                  <dt className="shiny">Shiny</dt><dd>{variants.shiny}</dd>
                </dl>
              </>
            )}
          </>
        ) : (
          <>
            <p className="inv-details-blurb">{item.blurb}</p>
            <hr />
            <div className="inv-owned">Owned: {total}</div>
            <dl className="inv-variants">
              <dt>Classic</dt><dd>{classic}</dd>
              <dt className="shiny">Shiny</dt><dd>{variants.shiny}</dd>
              <dt className="rainbow">Rainbow</dt><dd>{variants.rainbow}</dd>
            </dl>
            <hr />
            <div className="inv-equipped">Equipped: {total ? 'Classic' : 'None'}</div>
            <button type="button" className="inv-view" disabled={!total}>
              <span className="outlined">View {total} {NOUN[kind]}{total === 1 ? '' : 's'}</span>
            </button>
          </>
        )}
      </aside>
    </>
  );
}

const FUSION_MODES = [
  { mode: 'fuse', kind: 'ball', label: 'Balls', Icon: HornBallIcon, icon: 'horn' },
  { mode: 'upgrade', kind: 'ball', label: 'Balls', Icon: HornBallIcon, icon: 'horn' },
  { mode: 'upgrade', kind: 'flyer', label: 'Flyers', Icon: UfoIcon, icon: 'ufo' },
  { mode: 'upgrade', kind: 'explosion', label: 'Explosions', Icon: SplashIcon, icon: 'splash' },
];
const ARTICLE = { ball: 'a Ball', flyer: 'a Flyer', explosion: 'an Explosion' };

/**
 * The Fusion tab: on the left, Fusion (Balls) and Upgrade (Balls, Flyers, Explosions); on the right, the owned
 * things to pick from. Picking one shows what it takes and turns into, and the button that does it.
 */
function Fusion({ profile, onFuse }) {
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState(null);
  const [note, setNote] = useState(null);
  const { mode, kind } = FUSION_MODES[at];
  useEffect(() => {
    if (!note) return undefined;
    const timer = setTimeout(() => setNote(null), 2400);
    return () => clearTimeout(timer);
  }, [note]);
  const { from, to } = fuseStep(kind, mode);
  const owned = ORDER[kind].filter((id) => ownedCount(profile, kind, id) > 0);
  const have = (id) => (from === 'classic' ? profile[KINDS[kind].key]?.[id] ?? 0 : variantsOf(profile, kind, id)[from]);
  const name = picked ? KINDS[kind].items[picked]?.name : null;
  const go = async () => {
    const result = await onFuse(kind, picked, mode);
    setNote(result.error ? { text: 'Not enough to do that', bad: true } : { text: `You got a ${VARIANT_LABEL[to]}${name}!` });
  };
  return (
    <div className="fusion">
      <nav className="fusion-side">
        <div className="fusion-side-title">Fusion</div>
        {FUSION_MODES.map((entry, i) => (
          <React.Fragment key={`${entry.mode}${entry.kind}`}>
            {i === 1 && <div className="fusion-side-title">Upgrade</div>}
            <button type="button" className={`fusion-mode ${i === at ? 'active' : ''}`} onClick={() => { setAt(i); setPicked(null); }}>
              <entry.Icon className={`fusion-mode-icon ${entry.icon}`} />
              <span>{entry.label}</span>
            </button>
          </React.Fragment>
        ))}
      </nav>
      <div className="fusion-main">
        <div className="fusion-title">Select {ARTICLE[kind]} to {mode === 'fuse' ? 'Fuse' : 'Upgrade'}</div>
        <div className="fusion-scroll">
          {owned.length === 0 && <p className="fusion-empty">You don't have any {NOUN[kind].toLowerCase()}s yet.</p>}
          <div className="fusion-grid">
            {owned.map((id) => {
              const item = KINDS[kind].items[id];
              return (
                <button key={id} type="button" className={`fusion-tile ${item.rarity} ${picked === id ? 'picked' : ''}`} onClick={() => setPicked(id)}>
                  <span className="fusion-tile-art"><ItemIcon kind={kind} id={id} className="fusion-tile-icon" /></span>
                  <span className={`fusion-tile-name ${item.name.length > 13 ? 'small' : ''}`}>
                    <span>{item.name}</span><span>x{ownedCount(profile, kind, id)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {name && (
          <div className="fusion-bar">
            <ItemIcon kind={kind} id={picked} className="fusion-bar-icon" />
            <div className="fusion-bar-text">
              <b>{FUSE_COST}x {VARIANT_LABEL[from]}{name} → 1 {VARIANT_LABEL[to]}{name}</b>
              <span>You have {have(picked)} {from === 'classic' ? 'Classic' : 'Shiny'}</span>
            </div>
            <button type="button" className="fusion-go" disabled={have(picked) < FUSE_COST} onClick={go}>
              <span className="outlined">{mode === 'fuse' ? 'Fuse' : 'Upgrade'}</span>
            </button>
          </div>
        )}
        {note && <div className={`fusion-note outlined ${note.bad ? 'bad' : ''}`}>{note.text}</div>}
      </div>
    </div>
  );
}

/** The Inventory: Balls, Explosions and Flyers (owned first, then unowned by rarity), and Fusion. */
export default function Inventory({ owned, onFuse, onClose }) {
  const [tab, setTab] = useState('balls');
  const current = TABS.find((entry) => entry.id === tab);
  return (
    <section className={`popup inv-popup tab-${tab}`} aria-label="Inventory">
      <CloseButton className="inv-close" onClose={onClose} />
      <h2 className="inv-title outlined">Inventory</h2>
      <nav className="inv-tabs">
        {TABS.map(({ id, label, Icon, icon, isNew }) => (
          <button key={id} type="button" className={`inv-tab ${id} ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            <Icon className={`inv-tab-icon ${icon}`} />
            <span>{label}</span>
            {isNew && <b className="inv-new">NEW</b>}
          </button>
        ))}
      </nav>
      {tab === 'balls' && <button type="button" className="inv-help" aria-label="Help"><span className="outlined">?</span></button>}
      <div className="inv-body">
        {current.kind ? <Collection key={tab} kind={current.kind} profile={owned} /> : <Fusion profile={owned} onFuse={onFuse} />}
      </div>
    </section>
  );
}
