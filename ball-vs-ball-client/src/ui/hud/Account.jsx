import React, { useEffect, useRef, useState } from 'react';
import { getPlayerName, isEmbedded, logout, showLogin, toggleAvatarEditor } from '../../bloxity/sdk.js';
import { BuxMark } from '../icons/PopupIcons.jsx';

/** The player's Legion character's face (an ImageBitmap from the game's headshot camera). */
function CharacterFace({ picture }) {
  const canvas = useRef(null);
  useEffect(() => {
    const context = canvas.current?.getContext('2d');
    if (!context || !picture) return;
    context.clearRect(0, 0, picture.width, picture.height);
    context.drawImage(picture, 0, 0);
  }, [picture]);
  return <canvas ref={canvas} width={picture?.width ?? 128} height={picture?.height ?? 128} />;
}

/**
 * Top right, over the quests: the player's profile, opening a little menu (Edit Avatar, Bloxity's avatar editor).
 * Signed in, their Bloxity picture, name and Gems balance, and Log out when the game runs on its own site (inside
 * bloxity.io the portal signs players out). As a guest, their Legion character's face and the name Bloxity
 * suggests for them (e.g. "Shark84"), with Log in beside it. Without a Bloxity picture, the character's face is shown.
 */
export default function Account({ user, gems, picture }) {
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setOpen(false);
    setBroken(false);
  }, [user?._id]);

  const name = user ? user.displayName || user.username : getPlayerName();
  const face = user?.pfp && !broken
    ? <img src={user.pfp} alt="" onError={() => setBroken(true)} />
    : picture ? <CharacterFace picture={picture} /> : <span>{name.slice(0, 1).toUpperCase()}</span>;
  return (
    <div className="account">
      {!user && <button type="button" className="account-login" onClick={showLogin}><span className="outlined">Log in</span></button>}
      <button type="button" className={`account-chip${user ? '' : ' guest'}`} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className="account-pfp">{face}</span>
        <span className="account-who">
          <span className="account-name">{name}</span>
          {!user && <span className="account-guest">Guest</span>}
        </span>
        {user && gems !== null && <span className="account-gems"><BuxMark className="account-bux" />{gems.toLocaleString('en-US')}</span>}
      </button>
      {open && (
        <div className="account-menu">
          <button type="button" onClick={() => { setOpen(false); toggleAvatarEditor(); }}>Edit Avatar</button>
          {!user && <button type="button" onClick={() => { setOpen(false); showLogin(); }}>Log in to save progress</button>}
          {user && !isEmbedded() && <button type="button" onClick={() => { setOpen(false); logout(); }}>Log out</button>}
        </div>
      )}
    </div>
  );
}
