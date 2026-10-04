import React from 'react';
import { BoxIcon, BuxIcon, EmoteIcon, GumballIcon } from '../icons/Icons.jsx';

/** Left column: the "Random Epic Ball" odds offer, Store, Inventory and Emotes (each opens its window via `onOpen`). */
export default function SideMenu({ onOpen }) {
  return (
    <nav className="side-menu">
      <button type="button" className="odds-card" aria-label="Random Epic Ball offer">
        <span className="odds-badge">ODDS</span>
        <span className="odds-art" />
        <span className="odds-price">
          <s className="odds-old">99</s>
          <BuxIcon className="odds-bux" />
          <span className="odds-new">9</span>
        </span>
        <span className="odds-name">Random Epic Ball</span>
      </button>
      <button type="button" className="menu-card" onClick={() => onOpen('store')}>
        <GumballIcon className="menu-icon" />
        <span className="menu-label outlined">Store</span>
      </button>
      <button type="button" className="menu-card" onClick={() => onOpen('inventory')}>
        <BoxIcon className="menu-icon" />
        <span className="menu-label outlined">Inventory</span>
      </button>
      <button type="button" className="emotes-button" onClick={() => onOpen('emotes')}>
        <EmoteIcon className="emotes-icon" />
        <span className="outlined">Emotes</span>
        <kbd className="key-hint">R</kbd>
      </button>
    </nav>
  );
}
