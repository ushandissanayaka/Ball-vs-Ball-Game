import React, { useEffect, useState } from 'react';
import { getBuxBalance, purchaseItem } from '../../bloxity/sdk.js';
import { BuxMark } from '../icons/PopupIcons.jsx';
import { PlaceholderCube } from '../icons/ItemArt.jsx';

// Bux bundles the portal sells (the smallest that covers the price is offered when the balance is short).
const BUNDLES = [
  { bux: 500, was: 400, usd: '$4.99' },
  { bux: 1000, was: 800, usd: '$9.99' },
  { bux: 2000, was: 1700, usd: '$19.99' },
  { bux: 5250, was: 4500, usd: '$49.99' },
  { bux: 11000, was: 10000, usd: '$99.99' },
];

function Spinner({ className = '' }) {
  return <span className={`pay-spinner ${className}`} aria-hidden="true" />;
}

/**
 * The one payment window, for everything bought with bux (store items, the bundle, diamond packs, gifts, the
 * duel's Reroll when short of diamonds), in the Bloxity portal's own style. A white ring turns while it checks
 * the balance and while a purchase goes through.
 *   item: { id, name, bux, giftTo? }
 */
export default function PurchasePrompt({ item, onClose, onDone }) {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState('ready'); // ready | paying | unavailable | cancelled | done
  useEffect(() => {
    let live = true;
    Promise.all([getBuxBalance(), new Promise((resolve) => setTimeout(resolve, 650))]).then(([value]) => {
      if (!live) return;
      setBalance(value ?? 0);
      setLoading(false);
    });
    return () => { live = false; };
  }, []);
  const short = balance !== null && balance < item.bux;
  const bundle = BUNDLES.find((entry) => entry.bux >= item.bux - (balance ?? 0)) ?? BUNDLES.at(-1);

  const pay = async () => {
    setState('paying');
    const [result] = await Promise.all([purchaseItem(item), new Promise((resolve) => setTimeout(resolve, 900))]);
    setState(result);
    if (result === 'done') onDone?.(item);
  };

  const notes = {
    unavailable: 'Purchases are not available yet. Please try again later.',
    cancelled: 'The purchase was cancelled.',
    done: 'Purchase complete!',
  };

  return (
    <div className="pay-backdrop" onClick={(event) => event.target === event.currentTarget && state !== 'paying' && onClose()}>
      <section className="pay-modal" aria-label="Purchase">
        <header className="pay-head">
          <h2>{item.giftTo ? 'Gift item' : short ? 'Buy Bux and item' : 'Purchase item'}</h2>
          <span className="pay-balance"><BuxMark className="pay-bux" />{balance ?? '...'}</span>
          <button type="button" className="pay-close" aria-label="Close" disabled={state === 'paying'} onClick={onClose}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 L18 18 M18 6 L6 18" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" /></svg>
          </button>
        </header>
        {loading ? (
          <div className="pay-loading"><Spinner className="big" /></div>
        ) : (
          <>
            <div className="pay-item">
              <PlaceholderCube className="pay-cube" />
              <div>
                <div className="pay-item-name">{item.name}</div>
                {item.giftTo && <div className="pay-item-gift">for {item.giftTo}</div>}
                <div className="pay-item-price"><BuxMark className="pay-bux" />{item.bux}</div>
              </div>
            </div>
            {short && (
              <div className="pay-option">
                <span className="pay-option-amount"><BuxMark className="pay-bux" />{bundle.bux}</span>
                <s className="pay-option-old"><BuxMark className="pay-bux dim" />{bundle.was}</s>
                <span className="pay-option-cost">{bundle.usd}</span>
              </div>
            )}
            <button type="button" className="pay-go" disabled={state === 'paying' || state === 'done'} onClick={pay}>
              {state === 'paying' ? <><Spinner /><span>Processing...</span></> : state === 'done' ? 'Done' : 'Buy'}
            </button>
            <p className={`pay-terms ${state in notes ? `note ${state}` : ''}`}>
              {notes[state] ?? <>{short ? 'Your payment method will be charged. ' : ''}Bloxity <u>Terms of Use</u> apply.</>}
            </p>
          </>
        )}
      </section>
    </div>
  );
}
