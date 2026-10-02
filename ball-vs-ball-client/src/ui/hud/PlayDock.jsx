import React from 'react';
import { RingIcon } from '../icons/Icons.jsx';

/** Bottom-centre: the next level reward and the big green Play button. */
export default function PlayDock({ level }) {
  return (
    <section className="play-dock">
      <button type="button" className="level-reward">
        <span className="outlined">Lv {level} Reward</span>
        <RingIcon className="level-ring" />
      </button>
      <button type="button" className="play-button outlined">Play</button>
    </section>
  );
}
