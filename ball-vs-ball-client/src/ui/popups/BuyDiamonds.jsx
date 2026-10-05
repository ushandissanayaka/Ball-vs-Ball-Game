import React, { useState } from 'react';
import { BuxMark } from '../icons/PopupIcons.jsx';
import { PlaceholderCube } from '../icons/ItemArt.jsx';

/**
 * The portal's purchase prompt for a diamond pack (as the Reroll button opens it when the player is short of
 * diamonds): the pack and its price, the bux bundle that covers it, and Buy. Purchases go through the portal,
 * which this game can't reach yet, so Buy says so.
 */
export default function BuyDiamonds({ balance = 0, pack = { gems: 100, bux: 99 }, onClose }) {
  const [note, setNote] = useState(null);
  return (
    <div className="buy-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <section className="buy-modal" aria-label="Buy Robux and item">
        <header className="buy-head">
          <h2>Buy Robux and item</h2>
          <span className="buy-balance"><BuxMark className="buy-bux" />{balance}</span>
          <button type="button" className="buy-close" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 L18 18 M18 6 L6 18" stroke="#e8e8ea" strokeWidth="2.2" strokeLinecap="round" /></svg>
          </button>
        </header>
        <div className="buy-item">
          <PlaceholderCube className="buy-cube" />
          <div>
            <div className="buy-item-name">{pack.gems} Diamonds</div>
            <div className="buy-item-price"><BuxMark className="buy-bux" />{pack.bux}</div>
          </div>
        </div>
        <div className="buy-option">
          <span className="buy-option-amount"><BuxMark className="buy-bux" />500</span>
          <s className="buy-option-old"><BuxMark className="buy-bux dim" />400</s>
          <span className="buy-option-cost">$4.99</span>
        </div>
        <button type="button" className="buy-go" onClick={() => setNote('Purchases open soon')}>Buy</button>
        <p className="buy-terms">{note ?? <>Your payment method will be charged. Roblox <u>Terms of Use</u> apply.</>}</p>
      </section>
    </div>
  );
}
