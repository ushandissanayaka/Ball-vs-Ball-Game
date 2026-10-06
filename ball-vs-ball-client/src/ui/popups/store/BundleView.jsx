import React from 'react';
import { BUNDLE_BALL_SKU, BUNDLE_SKU, LIMITED_BUNDLE } from '../../../shared/rewards.js';
import { GemsPrice } from '../../hooks/useBloxity.js';
import { BuxMark } from '../../icons/PopupIcons.jsx';
import { CycleIcon, GiftIcon, LightwingBallArt, LightwingSceneArt, LightwingVolleyArt, LightwingWingsArt } from '../../icons/ItemArt.jsx';

const ART = { ball: LightwingBallArt, explosion: LightwingVolleyArt, flyer: LightwingWingsArt };

/** A bundle item's dark-red serial card: "ST" (the ball's stat track) and "#001" on top of its picture. */
function SerialCard({ kind, big }) {
  const Art = ART[kind];
  return (
    <div className={`serial-card ${big ? 'big' : ''}`}>
      {kind === 'ball' && <span className="serial-st">ST</span>}
      <span className="serial-no">#001</span>
      <Art className="serial-art" />
    </div>
  );
}

/** The Lightwing bundle (the store's "View >"): the ball alone or the whole set, with a big preview. */
export default function BundleView({ endsIn, onBuy, onGift, onClose }) {
  const { ballOnly, items, price } = LIMITED_BUNDLE;
  return (
    <section className="popup bundle-popup" aria-label={LIMITED_BUNDLE.name}>
      <h2 className="bundle-view-title">{LIMITED_BUNDLE.name}</h2>
      <div className="bundle-view-timer">
        <span className="bundle-view-limited">LIMITED TIME</span>
        <span className="bundle-view-ends">Ends in {endsIn}</span>
      </div>
      <button type="button" className="bundle-view-close" aria-label="Close" onClick={onClose}>
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M8 4 H22 L32 20 L42 4 H56 L40 32 L56 60 H42 L32 44 L22 60 H8 L24 32 Z" fill="#fff" stroke="#111318" strokeWidth="3.5" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="bundle-box ball-only">
        <h3 className="bundle-box-title">BALL ONLY</h3>
        <SerialCard kind="ball" />
        <div className="ball-only-name">{ballOnly.name}</div>
        <button type="button" className="bundle-buy-small" onClick={() => onBuy({ id: BUNDLE_BALL_SKU, name: ballOnly.name, bux: ballOnly.price.bux })}>
          <span className="outlined">Buy</span><BuxMark className="bundle-bux" /><span className="outlined"><GemsPrice sku={BUNDLE_BALL_SKU} fallback={ballOnly.price.bux} /></span>
        </button>
        <button type="button" className="bundle-gift-small" onClick={() => onGift({ id: BUNDLE_BALL_SKU, name: ballOnly.name, bux: ballOnly.price.bux })}>
          <GiftIcon className="bundle-gift-icon" /><span>Gift</span>
        </button>
      </div>

      <div className="bundle-box complete">
        <h3 className="bundle-box-title">COMPLETE BUNDLE</h3>
        <div className="complete-items">
          {items.map((item) => (
            <div key={item.kind} className="complete-item">
              <SerialCard kind={item.kind} big />
              <div className="complete-item-name">{item.name}</div>
            </div>
          ))}
        </div>
        <button type="button" className="bundle-buy-big" onClick={() => onBuy({ id: BUNDLE_SKU, name: `${LIMITED_BUNDLE.name} Bundle`, bux: price.bux })}>
          <span className="outlined">Buy</span><BuxMark className="bundle-bux big" /><span className="outlined"><GemsPrice sku={BUNDLE_SKU} fallback={price.bux} /></span>
        </button>
        <button type="button" className="bundle-gift-big" onClick={() => onGift({ id: BUNDLE_SKU, name: `${LIMITED_BUNDLE.name} Bundle`, bux: price.bux })}>
          <GiftIcon className="bundle-gift-icon big" /><span>Gift</span>
        </button>
      </div>
      <p className="bundle-serial-note">Serial numbers are unique. #001 is just an example.</p>

      <div className="bundle-preview"><LightwingSceneArt className="bundle-preview-art" /></div>
      <button type="button" className="combat-preview"><CycleIcon className="combat-preview-icon" /><span>Combat Preview</span></button>
    </section>
  );
}
