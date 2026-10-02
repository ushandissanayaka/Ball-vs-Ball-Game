import React from 'react';
import { formatMinSec } from '../../shared/constants.js';
import { CoinIcon, GemIcon } from '../icons/Icons.jsx';

/** Bottom-left: active coin boost ("x2 06:30"), coins and gems. */
export default function Wallet({ coins, gems, coinBoost, now }) {
  const boostLeft = coinBoost ? coinBoost.endsAt - now : 0;
  return (
    <section className="wallet">
      {boostLeft > 0 && (
        <div className="boost">
          <span className="boost-coin">
            <CoinIcon className="boost-coin-icon" />
            <span className="boost-x">x{coinBoost.multiplier}</span>
          </span>
          <span className="boost-time outlined">{formatMinSec(boostLeft)}</span>
        </div>
      )}
      <div className="balance balance-coins">
        <CoinIcon className="balance-icon" />
        <span className="balance-value coins-value">{coins.toLocaleString('en-US')}</span>
      </div>
      <div className="balance balance-gems">
        <GemIcon className="balance-icon gem" plus />
        <span className="balance-value gems-value">{gems.toLocaleString('en-US')}</span>
      </div>
    </section>
  );
}
