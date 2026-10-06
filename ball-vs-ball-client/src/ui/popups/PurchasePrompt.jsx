import React, { useContext, useEffect, useState } from 'react';
import { getGemsBalance } from '../../bloxity/sdk.js';
import { useGemsPrice } from '../hooks/useBloxity.js';
import { BuyContext } from '../hooks/buyContext.js';
import { BuxMark } from '../icons/PopupIcons.jsx';
import { PlaceholderCube } from '../icons/ItemArt.jsx';

function Spinner({ className = '' }) {
  return <span className={`pay-spinner ${className}`} aria-hidden="true" />;
}

const NOTES = {
  unavailable: 'Purchases are not available here. Please try again later.',
  cancelled: 'The purchase was cancelled.',
  failed: 'The purchase did not go through. Please try again.',
  login: 'Log in to Bloxity to buy with Gems.',
  done: 'Purchase complete!',
  gift: 'Gift sent!',
  pending: 'Purchase complete! It will arrive in a moment.',
};
const stateOf = (result) => {
  if (result.done) return result.gift ? 'gift' : result.pending ? 'pending' : 'done';
  if (result.error === 'unavailable') return 'unavailable';
  if (result.error === 'Not authenticated') return 'login';
  return /cancel/i.test(result.error ?? '') ? 'cancelled' : 'failed';
};

/**
 * The one payment window, for everything bought with Gems (store items, the bundle, diamond packs, gifts, the
 * duel's Reroll when short of diamonds, balls bought early), in the Bloxity portal's own style. Buy hands the
 * product's sku to Bloxity, which confirms and charges it at its own price. A white ring turns while it
 * checks the balance and while a purchase goes through.
 *   item: { id (the sku), name, bux (the price shown until Bloxity's catalog says), giftTo?: { id, name } }
 * The purchase itself (BuyContext) resolves to { done, gift?, pending? } or { error }.
 */
export default function PurchasePrompt({ item, onClose }) {
  const onBuy = useContext(BuyContext);
  const price = useGemsPrice(item.id, item.bux);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState('ready'); // ready | paying | done | gift | pending | cancelled | failed | login | unavailable
  useEffect(() => {
    let live = true;
    Promise.all([getGemsBalance(), new Promise((resolve) => setTimeout(resolve, 650))]).then(([value]) => {
      if (!live) return;
      setBalance(value);
      setLoading(false);
    });
    return () => { live = false; };
  }, []);
  const finished = state === 'done' || state === 'gift' || state === 'pending';

  const pay = async () => {
    setState('paying');
    const result = await onBuy(item);
    setState(stateOf(result));
    if (result.done) getGemsBalance().then(setBalance);
  };

  return (
    <div className="pay-backdrop" onClick={(event) => event.target === event.currentTarget && state !== 'paying' && onClose()}>
      <section className="pay-modal" aria-label="Purchase">
        <header className="pay-head">
          <h2>{item.giftTo ? 'Gift item' : 'Purchase item'}</h2>
          {balance !== null && <span className="pay-balance"><BuxMark className="pay-bux" />{balance.toLocaleString('en-US')}</span>}
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
                {item.giftTo && <div className="pay-item-gift">for {item.giftTo.name}</div>}
                <div className="pay-item-price"><BuxMark className="pay-bux" />{price}</div>
              </div>
            </div>
            <button type="button" className="pay-go" disabled={state === 'paying' || finished} onClick={pay}>
              {state === 'paying' ? <><Spinner /><span>Processing...</span></> : finished ? 'Done' : 'Buy'}
            </button>
            <p className={`pay-terms ${state in NOTES ? `note ${finished ? 'done' : state}` : ''}`}>
              {NOTES[state] ?? <>Paid with Bloxity Gems. Bloxity <u>Terms of Use</u> apply.</>}
            </p>
          </>
        )}
      </section>
    </div>
  );
}
