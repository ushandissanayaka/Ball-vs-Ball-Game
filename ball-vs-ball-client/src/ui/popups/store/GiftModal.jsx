import React, { useEffect, useState } from 'react';
import { getFriends, hasBloxity } from '../../../bloxity/sdk.js';
import { GemsPrice } from '../../hooks/useBloxity.js';
import { BuxMark } from '../../icons/PopupIcons.jsx';
import { PlaceholderCube, SearchIcon } from '../../icons/ItemArt.jsx';

// Shown in a local preview without the Bloxity SDK: sample friends, like the Trade tab's players (never gifted to).
const SAMPLE_FRIENDS = [
  { id: 's1', name: 'Pader', handle: 'Exyonea', hue: 120 },
  { id: 's2', name: 'ripvn56762', handle: 'ripvn56762', hue: 20 },
  { id: 's3', name: 'thamtack', handle: 'thamtack', hue: 45 },
  { id: 's4', name: 'robloxian_nael', handle: 'sprunkinaeliiee27', hue: 200 },
  { id: 's5', name: 'NovaStriker', handle: 'novastriker', hue: 280 },
];

/** The portal-style gifting window: the item and its price, a search box and the friends to gift it to. */
export default function GiftModal({ item, onClose, onSend }) {
  const [friends, setFriends] = useState(null);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState(null);
  useEffect(() => {
    let live = true;
    getFriends().then((list) => {
      if (!live) return;
      setFriends(hasBloxity() ? list.map((f) => ({ ...f, handle: f.username || f.name.toLowerCase() })) : SAMPLE_FRIENDS);
    });
    return () => { live = false; };
  }, []);
  const shown = (friends ?? []).filter((f) => f.name.toLowerCase().includes(query.trim().toLowerCase()));
  const select = (friend) => {
    setPicked(friend.id);
    if (!hasBloxity()) return; // a sample friend
    onSend(friend, item);
  };
  return (
    <div className="gift-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <section className="gift-modal" aria-label="Gifting">
        <header className="gift-head">
          <h2>Gifting</h2>
          <button type="button" className="gift-close" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 L18 18 M18 6 L6 18" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" /></svg>
          </button>
        </header>
        <div className="gift-item">
          <PlaceholderCube className="gift-item-cube" />
          <div>
            <div className="gift-item-name">{item.name}</div>
            <div className="gift-item-price"><BuxMark className="gift-bux" /><GemsPrice sku={item.id} fallback={item.bux} /></div>
          </div>
        </div>
        <label className="gift-search">
          <SearchIcon className="gift-search-icon" />
          <input type="text" placeholder="Search..." value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="gift-list">
          {friends === null && <p className="gift-empty">Loading friends...</p>}
          {friends !== null && shown.length === 0 && <p className="gift-empty">No friends found</p>}
          {shown.map((friend) => (
            <div key={friend.id} className="gift-friend">
              <span className="gift-avatar" style={{ '--hue': friend.hue ?? (String(friend.id).length * 47) % 360 }}>
                {friend.avatarUrl ? <img src={friend.avatarUrl} alt="" /> : <span>{friend.name[0]?.toUpperCase()}</span>}
              </span>
              <span className="gift-friend-name">{friend.name}<small>@{friend.handle}</small></span>
              <button type="button" className={`gift-select ${picked === friend.id ? 'picked' : ''}`} onClick={() => select(friend)}>
                {picked === friend.id ? 'Selected' : 'Select'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
