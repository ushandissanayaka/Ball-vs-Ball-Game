import React, { useId } from 'react';

// Every HUD icon as inline SVG: no image downloads, sharp at any size. Each takes a className for sizing.

export function CoinIcon({ className }) {
  const id = useId();
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <radialGradient id={id} cx="38%" cy="32%" r="70%">
          <stop offset="0" stopColor="#fff4a8" />
          <stop offset="0.5" stopColor="#ffc41f" />
          <stop offset="1" stopColor="#e08a00" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="29" fill={`url(#${id})`} stroke="#a85f00" strokeWidth="3" />
      <circle cx="32" cy="32" r="20" fill="none" stroke="#ffe27a" strokeWidth="3" opacity="0.8" />
    </svg>
  );
}

export function GemIcon({ className, plus = false }) {
  const id = useId();
  return (
    <svg className={className} viewBox="0 0 72 64" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9fe6ff" />
          <stop offset="1" stopColor="#1f7fe8" />
        </linearGradient>
      </defs>
      <path d="M14 6h44l12 16-34 40L2 22z" fill={`url(#${id})`} stroke="#0d3f86" strokeWidth="3" strokeLinejoin="round" />
      <path d="M2 22h68M24 6l-6 16 18 40 18-40-6-16" fill="none" stroke="#e5f8ff" strokeWidth="2" opacity="0.7" />
      {plus && (
        <g>
          <rect x="2" y="38" width="26" height="26" rx="5" fill="#2f86ff" stroke="#fff" strokeWidth="3" />
          <path d="M15 43v16M7 51h16" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

export function BuxIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 2l12 7v14l-12 7-12-7V9z" fill="#2fd24a" stroke="#0d5a1a" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M16 9l6 3.5v7L16 23l-6-3.5v-7z" fill="#0d5a1a" />
    </svg>
  );
}

export function QuestIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true">
      <rect x="5" y="4" width="24" height="31" rx="3" fill="#fff" />
      <path d="M10 13h14M10 19h14M10 25h9" stroke="#3a7be0" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M23 33l3-8 11-11 4 4-11 11z" fill="#fff" stroke="#3a7be0" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function HandshakeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 48 36" aria-hidden="true">
      <g fill="#fff" stroke="#2b2f3a" strokeWidth="2" strokeLinejoin="round">
        <path d="M2 10l8-6 8 3 7-2 9 6-3 5-7-4-6 5c-2 2-5 1-5-1l5-5-3-1-9 8z" />
        <path d="M46 10l-8-6-6 2 4 3 7 1 1 9-6 6c-2 2-4 2-5 0-2 2-4 2-5 0-2 2-4 1-5-1-2 1-4 0-4-2l-4-3 3-4" />
      </g>
    </svg>
  );
}

export function GumballIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 64 72" aria-hidden="true">
      <g fill="none" stroke="#fff" strokeWidth="4" strokeLinejoin="round">
        <path d="M24 6h16v6H24z" fill="#fff" />
        <circle cx="32" cy="30" r="19" />
        <path d="M14 48h36l4 18H10z" />
        <path d="M26 56h12" strokeLinecap="round" />
      </g>
      <g fill="#fff">
        <circle cx="25" cy="25" r="5" /><circle cx="37" cy="23" r="5" /><circle cx="31" cy="34" r="5" />
        <circle cx="21" cy="36" r="4.5" /><circle cx="42" cy="34" r="4.5" />
      </g>
    </svg>
  );
}

export function BoxIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 4l26 12v32L32 60 6 48V16z" fill="#fff" />
      <path d="M6 16l26 12 26-12M32 28v32" stroke="#1d2636" strokeWidth="4" fill="none" strokeLinejoin="round" />
      <path d="M44 34l10-5v10l-10 5z" fill="#1d2636" />
    </svg>
  );
}

export function EmoteIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="6" r="4.5" fill="#fff" />
      <path d="M4 14l16 1 16-1M20 15v10l-6 12M20 25l6 12" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/** The cyan level-reward ring. */
export function RingIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="27" fill="#14353d" stroke="#3fd6c8" strokeWidth="7" />
      <circle cx="32" cy="32" r="15" fill="#effcff" stroke="#9cf3ff" strokeWidth="3" />
    </svg>
  );
}

/** Quick Join slot: an unknown opponent ("?") or a waiting player. */
export function SlotIcon({ className, filled }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="29" fill={filled ? '#2a3550' : '#1c1f29'} stroke={filled ? '#3a7bd5' : '#e04848'} strokeWidth="4" />
      {filled ? (
        <g fill="#cfd8ea">
          <circle cx="32" cy="25" r="10" />
          <path d="M14 52c2-11 9-15 18-15s16 4 18 15z" />
        </g>
      ) : (
        <text x="32" y="45" textAnchor="middle" fontSize="38" fontWeight="900" fill="#fff" fontFamily="Nunito, Arial">?</text>
      )}
    </svg>
  );
}

