import React from 'react';
import { EmoteFigure, UfoIcon } from '../icons/PopupIcons.jsx';

// The eight slots, clockwise from the top: emotes (a pose) and, at the bottom, Flyer slots.
const SLOTS = [
  { pose: 'cheer' }, { pose: 'flex' }, { pose: 'wave' }, { flyer: true },
  { flyer: true }, { flyer: true }, { pose: 'point' }, { pose: 'flex' },
];

/** The emote wheel (Emotes button or R): eight slots round the "Emotes" hub, with Close and Edit under it. */
export default function EmoteWheel({ onClose }) {
  return (
    <section className="emote-wheel" aria-label="Emotes">
      <div className="emote-disc">
        <div className="emote-flyer-zone" />
        {SLOTS.map((_, i) => <span key={`line${i}`} className="emote-line" style={{ '--a': `${i * 45 + 22.5}deg` }} />)}
        {SLOTS.map((slot, i) => (
          <button key={i} type="button" className={`emote-slot ${slot.flyer ? 'flyer' : ''}`} style={{ '--a': `${i * 45}deg` }} onClick={onClose}>
            {slot.flyer ? (
              <>
                <UfoIcon className="emote-ufo" beam={false} />
                <span className="emote-flyer-label">Flyers</span>
              </>
            ) : (
              <EmoteFigure className="emote-figure" pose={slot.pose} />
            )}
          </button>
        ))}
        {SLOTS.map((_, i) => <span key={`n${i}`} className="emote-number" style={{ '--a': `${i * 45}deg` }}>{i + 1}</span>)}
        <div className="emote-hub"><span>Emotes</span></div>
      </div>
      <div className="emote-actions">
        <button type="button" className="emote-close" onClick={onClose}><span className="outlined">CLOSE</span></button>
        <button type="button" className="emote-edit"><span className="outlined">Edit</span></button>
      </div>
    </section>
  );
}
