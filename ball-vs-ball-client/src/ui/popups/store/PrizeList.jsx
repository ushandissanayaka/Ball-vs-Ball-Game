import React from 'react';
import { CRATES } from '../../../shared/rewards.js';
import CloseButton from '../CloseButton.jsx';
import { PrizeTile, prizesOf } from './CrateView.jsx';

/** "View All >": every prize a crate can give, in a window over the store. */
export default function PrizeList({ crateId, onClose }) {
  const crate = CRATES[crateId];
  return (
    <div className="prize-list-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <section className="prize-list" aria-label={crate.name}>
        <CloseButton className="prize-list-close" onClose={onClose} />
        <h3 className="prize-list-title outlined">{crate.name}</h3>
        <div className="prize-list-grid">
          {prizesOf(crate).map((id) => <PrizeTile key={id} kind={crate.kind} id={id} />)}
        </div>
      </section>
    </div>
  );
}
