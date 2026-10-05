import React, { useEffect, useState } from 'react';
import { STICKERS } from '../../scene/stickers.js';
import { setStickerSoundsMuted, stickerSoundsMuted } from '../../audio/sfx.js';

const COOLDOWN_MS = 1000; // as the server allows: one a second

function StickerIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M8 4 H32 Q36 4 36 8 V24 L24 36 H8 Q4 36 4 32 V8 Q4 4 8 4 Z" fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
      <path d="M36 24 H28 Q24 24 24 28 V36" fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="14" cy="15" r="2.2" fill="#fff" />
      <circle cx="25" cy="15" r="2.2" fill="#fff" />
      <path d="M12 22 Q19 28 26 22" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function SpeakerIcon({ className, muted }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M6 15 H13 L22 7 V33 L13 25 H6 Z" fill="#fff" />
      {muted ? (
        <path d="M27 14 L37 26 M37 14 L27 26" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
      ) : (
        <g fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round">
          <path d="M27 14 Q31 20 27 26" />
          <path d="M31 9 Q38 20 31 31" />
        </g>
      )}
    </svg>
  );
}

/** The sticker button (bottom right) and its panel of six emojis; picking one pops it over the character's head. */
export default function Stickers({ onSend }) {
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(stickerSoundsMuted);
  const [coolUntil, setCoolUntil] = useState(0);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!coolUntil) return undefined;
    const timer = setTimeout(() => tick((n) => n + 1), Math.max(0, coolUntil - performance.now()) + 20);
    return () => clearTimeout(timer);
  }, [coolUntil]);
  const cooling = performance.now() < coolUntil;
  const send = (index) => {
    if (cooling) return;
    onSend(index);
    setCoolUntil(performance.now() + COOLDOWN_MS);
    setOpen(false);
  };
  const toggleMute = () => {
    setStickerSoundsMuted(!muted);
    setMuted(!muted);
  };
  return (
    <>
      {open && (
        <section className="stickers-panel" aria-label="Stickers">
          <header className="stickers-head">
            <StickerIcon className="stickers-head-icon" />
            <span className="stickers-title">Stickers</span>
            <button type="button" className="stickers-mute" aria-label={muted ? 'Sticker sounds on' : 'Sticker sounds off'} onClick={toggleMute}>
              <SpeakerIcon className="stickers-mute-icon" muted={muted} />
            </button>
            <button type="button" className="stickers-close" aria-label="Close" onClick={() => setOpen(false)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5 L19 19 M19 5 L5 19" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" /></svg>
            </button>
          </header>
          <div className="stickers-grid">
            {STICKERS.map((emoji, i) => (
              <button type="button" key={emoji} className="sticker" disabled={cooling} onClick={() => send(i)}>
                <span className="sticker-emoji">{emoji}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      <button type="button" className={`stickers-button ${open ? 'open' : ''}`} aria-label="Stickers" onClick={() => setOpen((o) => !o)}>
        <StickerIcon className="stickers-button-icon" />
      </button>
    </>
  );
}
