import React, { useEffect, useState } from 'react';
import { getFriends, getInviteLink, inviteFriend } from '../../bloxity/sdk.js';

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" className="invite-close-icon" aria-hidden="true">
    <path d="M5 5 L19 19 M19 5 L5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" className="invite-search-icon" aria-hidden="true">
    <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M15.5 15.5 L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const LinkIcon = () => (
  <svg viewBox="0 0 24 24" className="invite-link-icon" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M10 14 a4.2 4.2 0 0 0 6 0 l3-3 a4.2 4.2 0 0 0-6-6 l-1.2 1.2" />
      <path d="M14 10 a4.2 4.2 0 0 0-6 0 l-3 3 a4.2 4.2 0 0 0 6 6 l1.2-1.2" />
    </g>
  </svg>
);
const FriendsIcon = () => (
  <svg viewBox="0 0 48 48" className="invite-empty-icon" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
      <rect x="9" y="6" width="11" height="12" rx="4" transform="rotate(-12 14.5 12)" />
      <circle cx="31" cy="12" r="6" />
      <path d="M4 40 c0-8 4-14 11-14 s11 6 11 14 Z" />
      <path d="M22 40 c0-8 4-14 10-14 s11 6 11 14 Z" />
    </g>
  </svg>
);

/** A friend's round picture, or their initial when they have none. */
function FriendAvatar({ friend }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className={`invite-avatar${friend.online ? ' online' : ''}`}>
      {friend.avatarUrl && !broken
        ? <img src={friend.avatarUrl} alt="" onError={() => setBroken(true)} />
        : <span className="invite-initial">{friend.name.slice(0, 1).toUpperCase()}</span>}
    </span>
  );
}

/**
 * "Invite Friends", opened from the arena's Invite button (as on the Bloxity portal): Copy Link at the top, a
 * search box, the copy-link row, then the player's friends, each with an Invite button (or, with none, "Add
 * friends so you can explore together."). Closes on the X, Escape or a click outside it.
 */
export default function InviteFriends({ onClose }) {
  const [friends, setFriends] = useState(null); // null while loading
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [invited, setInvited] = useState({}); // friend id -> 'sending' | 'sent' | 'failed'

  useEffect(() => {
    let live = true;
    getFriends().then((list) => { if (live) setFriends(list); });
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      live = false;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getInviteLink());
      setCopied(true);
    } catch {
      window.prompt('Copy this link:', getInviteLink()); // no clipboard access (an old browser or an iframe)
    }
  };
  const invite = async (friend) => {
    setInvited((state) => ({ ...state, [friend.id]: 'sending' }));
    const sent = await inviteFriend(friend.id);
    setInvited((state) => ({ ...state, [friend.id]: sent ? 'sent' : 'failed' }));
  };

  const needle = search.trim().toLowerCase();
  const shown = (friends ?? [])
    .filter((friend) => friend.name.toLowerCase().includes(needle))
    .sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name));

  return (
    <section className="invite-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="invite-modal" role="dialog" aria-label="Invite Friends">
        <header className="invite-header">
          <button type="button" className="invite-close" aria-label="Close" onClick={onClose}><CloseIcon /></button>
          <h2 className="invite-title">Invite Friends</h2>
          <button type="button" className="invite-copy" onClick={copyLink}>{copied ? 'Copied!' : 'Copy Link'}</button>
        </header>
        <label className="invite-search">
          <SearchIcon />
          <input type="text" placeholder="Search for Friends" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <button type="button" className="invite-link-row" onClick={copyLink}>
          <span className="invite-link-badge"><LinkIcon /></span>
          <span>{copied ? 'Link copied!' : 'Copy link to share with people you know'}</span>
        </button>
        <div className="invite-list">
          {friends === null && <p className="invite-status">Loading friends...</p>}
          {friends?.length === 0 && (
            <div className="invite-empty">
              <FriendsIcon />
              <p>Add friends so you can explore together.</p>
            </div>
          )}
          {friends?.length > 0 && shown.length === 0 && <p className="invite-status">No friends match "{search}".</p>}
          {shown.map((friend) => {
            const state = invited[friend.id];
            return (
              <div key={friend.id} className="invite-friend">
                <FriendAvatar friend={friend} />
                <span className="invite-friend-name">
                  {friend.name}
                  <small>{friend.online ? 'Online' : 'Offline'}</small>
                </span>
                <button type="button" className="invite-send" disabled={state === 'sending' || state === 'sent'} onClick={() => invite(friend)}>
                  {state === 'sent' ? 'Invited' : state === 'sending' ? 'Sending...' : state === 'failed' ? 'Try again' : 'Invite'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
