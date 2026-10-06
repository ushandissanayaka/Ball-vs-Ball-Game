import React, { useEffect, useState } from 'react';
import { formatClock, nextCycleEnd, nextDailyReset } from '../../shared/constants.js';
import { BUNDLE_SKU, CRATES, DAILY_STORE, LIMITED_BUNDLE, gemPackSku } from '../../shared/rewards.js';
import { GemsPrice } from '../hooks/useBloxity.js';
import { CoinIcon, GemIcon } from '../icons/Icons.jsx';
import { BuxMark, EventsIcon, HornBallIcon, SplashIcon, UfoIcon } from '../icons/PopupIcons.jsx';
import { ItemIcon, LightwingBallArt, LightwingVolleyArt, LightwingWingsArt } from '../icons/ItemArt.jsx';
import CloseButton from './CloseButton.jsx';
import CrateView from './store/CrateView.jsx';
import GemsView from './store/GemsView.jsx';
import BundleView from './store/BundleView.jsx';
import GiftModal from './store/GiftModal.jsx';
import CrateReveal from './store/CrateReveal.jsx';
import PrizeList from './store/PrizeList.jsx';
import PurchasePrompt from './PurchasePrompt.jsx';

const DAY = 24 * 3600_000;
const TAB_KIND = { balls: 'ball', explosions: 'explosion', flyers: 'flyer' };

/** "13d 11h" */
function daysHours(ms) {
  const hours = Math.max(0, Math.floor(ms / 3600_000));
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

/** A coin price, or a Gems one (as Bloxity's catalog prices product `sku`). */
function Price({ price, sku }) {
  return price.coins ? (
    <><CoinIcon className="store-price-icon" /><span className="outlined">{price.coins}</span></>
  ) : (
    <><BuxMark className="store-price-icon" /><span className="outlined"><GemsPrice sku={sku} fallback={price.bux} /></span></>
  );
}

const MESSAGES = {
  coins: 'Not enough coins', gems: 'Not enough diamonds', bux: 'Bux purchases open soon', claimed: 'Already claimed today',
  refused: 'Could not do that, try again',
};

/** The Events tab: today's four items and the limited-time bundle. */
function EventsView({ now, onBuy, onView, onBux }) {
  return (
    <>
      <div className="store-daily">
        <div className="store-daily-head">
          <h3 className="store-daily-title">Daily Store</h3>
          <span className="store-refresh">Refreshes in {formatClock(nextDailyReset(now) - now)}</span>
        </div>
        <div className="store-items">
          {DAILY_STORE.map((item) => (
            <div key={item.id} className={`store-item ${item.id === 'cannon' ? 'epic' : ''}`}>
              <div className="store-item-card">
                <div className="store-item-art">
                  <ItemIcon kind={item.kind} id={item.id} className={`store-item-icon ${item.kind !== 'ball' ? 'wide' : ''}`} />
                </div>
                <div className="store-item-name">{item.name}</div>
              </div>
              <button type="button" className={`store-buy ${item.price.coins ? 'coins' : 'bux'}`} onClick={() => onBuy(item)}>
                <Price price={item.price} sku={item.id} />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="store-bundle">
        <div className="bundle-text">
          <span className="bundle-tag">LIMITED-TIME BUNDLE</span>
          <h3 className="bundle-name">{LIMITED_BUNDLE.name}</h3>
          <div className="bundle-contents">{LIMITED_BUNDLE.contents}</div>
          <div className="bundle-ends">Ends in {daysHours(nextCycleEnd(now, LIMITED_BUNDLE.days * DAY) - now)}</div>
        </div>
        <div className="bundle-art">
          <LightwingVolleyArt className="bundle-art-volley" />
          <LightwingBallArt className="bundle-art-ball" />
          <LightwingWingsArt className="bundle-art-wings" />
        </div>
        <div className="bundle-buttons">
          <button type="button" className="bundle-view" onClick={onView}><span className="outlined">View &gt;</span></button>
          <button type="button" className="bundle-buy" onClick={onBux}><Price price={LIMITED_BUNDLE.price} sku={BUNDLE_SKU} /></button>
        </div>
      </div>
    </>
  );
}

/**
 * The Store: wallet bars and category tabs over the Events page (daily items, bundle), a crate page for
 * Balls, Explosions and Flyers, or the diamond packs ("+"). "View >" opens the bundle's own screen; gifts,
 * crate prizes and prize lists open over it.
 */
export default function Store({ profile, now, actions, onClose }) {
  const [view, setView] = useState('events');
  const [note, setNote] = useState(null);
  const [reveal, setReveal] = useState(null); // { kind, prizes }
  const [gift, setGift] = useState(null); // { id (sku), name, bux }
  const [prizeList, setPrizeList] = useState(null); // a crate id
  const [paying, setPaying] = useState(null); // { id (sku), name, bux, giftTo? }: the payment window
  useEffect(() => {
    if (!note) return undefined;
    const timer = setTimeout(() => setNote(null), 2200);
    return () => clearTimeout(timer);
  }, [note]);

  const fail = (error) => setNote({ text: MESSAGES[error] ?? MESSAGES.refused, bad: true });
  const pay = (item) => setPaying(item);
  const buy = async (item) => {
    if (!item.price.coins) return pay({ id: item.id, name: item.name, bux: item.price.bux });
    const result = await actions.buy(item.id);
    return result.error ? fail(result.error) : setNote({ text: `Bought ${item.name}!` });
  };
  const open = async (crateId, count) => {
    const result = await actions.openCrate(crateId, count);
    if (result.error) return fail(result.error);
    return setReveal({ kind: CRATES[crateId].kind, prizes: result.prizes });
  };
  const claimGems = async () => {
    const result = await actions.claimGems();
    return result.error ? fail(result.error) : setNote({ text: 'Daily Diamonds claimed!' });
  };
  const sendGift = (friend, item) => {
    setGift(null);
    pay({ ...item, giftTo: { id: friend.id, name: friend.name } });
  };
  const overlays = (
    <>
      {gift && <GiftModal item={gift} onClose={() => setGift(null)} onSend={sendGift} />}
      {prizeList && <PrizeList crateId={prizeList} onClose={() => setPrizeList(null)} />}
      {reveal && <CrateReveal kind={reveal.kind} prizes={reveal.prizes} onClose={() => setReveal(null)} />}
      {paying && <PurchasePrompt item={paying} onClose={() => setPaying(null)} />}
      {note && <div className={`store-note outlined ${note.bad ? 'bad' : ''}`}>{note.text}</div>}
    </>
  );

  if (view === 'bundle') {
    return (
      <>
        <BundleView
          endsIn={daysHours(nextCycleEnd(now, LIMITED_BUNDLE.days * DAY) - now)}
          onBuy={pay} onGift={setGift} onClose={() => setView('events')}
        />
        {overlays}
      </>
    );
  }

  return (
    <>
      <section className={`popup store-popup view-${view}`} aria-label="Store">
        <CloseButton className="store-close" onClose={onClose} />
        <header className="store-head">
          <h2 className="store-title outlined">Store</h2>
          <div className="store-bar coins">
            <CoinIcon className="store-bar-icon" />
            <span className="store-bar-value outlined">{profile.coins}</span>
          </div>
          <div className="store-bar gems">
            <GemIcon className="store-bar-icon gem" />
            <span className="store-bar-value outlined">{profile.gems}</span>
          </div>
          <button type="button" className="store-plus" aria-label="Get diamonds" onClick={() => setView('gems')}><span className="outlined">+</span></button>
        </header>
        <nav className="store-tabs">
          <button type="button" className="store-tab events" onClick={() => setView('events')}><EventsIcon className="store-tab-icon events" /><span>Events</span></button>
          <button type="button" className="store-tab balls" onClick={() => setView('balls')}><HornBallIcon className="store-tab-icon horn" /><span>Balls</span></button>
          <button type="button" className="store-tab explosions" onClick={() => setView('explosions')}><SplashIcon className="store-tab-icon splash" /><span>Explosions</span></button>
          <button type="button" className="store-tab flyers" onClick={() => setView('flyers')}><UfoIcon className="store-tab-icon ufo" /><span>Flyers</span></button>
        </nav>
        {view === 'events' && (
          <EventsView
            now={now} onBuy={buy} onView={() => setView('bundle')}
            onBux={() => pay({ id: BUNDLE_SKU, name: `${LIMITED_BUNDLE.name} Bundle`, bux: LIMITED_BUNDLE.price.bux })}
          />
        )}
        {TAB_KIND[view] && (
          <CrateView
            key={view} kind={TAB_KIND[view]} wallet={profile}
            onOpen={open} onViewAll={setPrizeList} onMore={() => setView('gems')}
          />
        )}
        {view === 'gems' && (
          <GemsView
            gemsDay={profile.gemsDay} now={now} onBuy={(pack) => pay({ id: gemPackSku(pack), name: `${pack.gems} Diamonds`, bux: pack.bux })} onClaimDaily={claimGems}
            onGift={(pack) => setGift({ id: gemPackSku(pack), name: `${pack.gems} Diamonds`, bux: pack.bux })}
          />
        )}
      </section>
      {overlays}
    </>
  );
}
