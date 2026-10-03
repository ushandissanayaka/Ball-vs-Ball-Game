import React, { useId } from 'react';

// The duel balls as HUD icons (inline SVG, drawn to match the 3D balls): a shaded sphere with a dark outline
// and each kind's mark. `kind` 'unknown' is the grey "?" ball shown before a player's choice is revealed.

const SHADES = {
  electric: ['#8cc6ff', '#1f6fe6', '#0d3a8f'],
  charge: ['#9ff6ee', '#2fd3c4', '#14857b'],
  cell: ['#b6f39c', '#4fc760', '#24803a'],
  axe: ['#7a85a0', '#3b4459', '#1a1f2c'],
  snake: ['#ffffff', '#f1f1ea', '#c5c5bb'],
  spike: ['#ff9a9a', '#e04646', '#931c1c'],
  fire: ['#ffd27a', '#f07a2a', '#a8380c'],
  rock: ['#c9c5bf', '#8d8a86', '#4f4c49'],
  unknown: ['#c4c9d2', '#868c97', '#4a4f59'],
};

function Mark({ kind, id }) {
  switch (kind) {
    case 'electric':
      return <path d="M57 16 L33 54 L48 54 L41 86 L68 44 L53 44 L63 16 Z" fill="#fff" stroke="#0b2a66" strokeWidth="3" strokeLinejoin="round" />;
    case 'charge':
      return (
        <>
          <circle cx="50" cy="50" r="26" fill="#262b52" />
          <circle cx="50" cy="50" r="16" fill={`url(#${id}-core)`} />
        </>
      );
    case 'cell':
      return (
        <>
          <circle cx="43" cy="42" r="17" fill="#c4f28a" opacity="0.9" />
          <circle cx="39" cy="37" r="6" fill="#f0ffd0" />
          <circle cx="63" cy="60" r="5" fill="#8fe07a" />
        </>
      );
    case 'axe':
      return (
        <>
          <path d="M66 18 Q80 50 66 82" fill="none" stroke="#ff6a1a" strokeWidth="10" strokeLinecap="round" opacity="0.45" />
          <path d="M66 18 Q80 50 66 82" fill="none" stroke="#ffb35c" strokeWidth="4.5" strokeLinecap="round" />
        </>
      );
    case 'snake':
      return (
        <>
          <ellipse cx="38" cy="42" rx="7" ry="9" fill="#141414" />
          <ellipse cx="62" cy="42" rx="7" ry="9" fill="#141414" />
          <circle cx="40" cy="39" r="2.6" fill="#fff" />
          <circle cx="64" cy="39" r="2.6" fill="#fff" />
          <path d="M27 55 Q50 88 73 55 Q50 68 27 55 Z" fill="#141414" />
        </>
      );
    case 'spike':
      return Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const x = 50 + Math.cos(a) * 40;
        const y = 50 + Math.sin(a) * 40;
        const tip = [50 + Math.cos(a) * 56, 50 + Math.sin(a) * 56];
        const l = [x + Math.cos(a + Math.PI / 2) * 7, y + Math.sin(a + Math.PI / 2) * 7];
        const r = [x - Math.cos(a + Math.PI / 2) * 7, y - Math.sin(a + Math.PI / 2) * 7];
        return <path key={i} d={`M${l} L${tip} L${r} Z`} fill="#f4f6fb" stroke="#4a0d0d" strokeWidth="2" strokeLinejoin="round" />;
      });
    case 'fire':
      return <path d="M50 20 C62 36 72 44 68 60 C66 72 56 80 50 80 C40 80 32 72 32 61 C32 50 40 46 42 36 C48 44 46 52 52 54 C56 46 54 32 50 20 Z" fill="#ffd23a" stroke="#c4400d" strokeWidth="2.5" />;
    case 'rock':
      return <path d="M30 40 L44 30 L60 34 M44 30 L46 52 L66 58 M46 52 L32 64" fill="none" stroke="#3d3a37" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />;
    case 'unknown':
      return (
        <text x="50" y="68" textAnchor="middle" fontFamily="Michroma, Arial Black, sans-serif" fontSize="50" fill="#fff" stroke="#2a2e36" strokeWidth="5" paintOrder="stroke">?</text>
      );
    default:
      return null;
  }
}

export default function BallIcon({ kind, className }) {
  const id = useId().replace(/:/g, '');
  const [light, mid, dark] = SHADES[kind] ?? SHADES.unknown;
  const spiky = kind === 'spike';
  return (
    <svg className={className} viewBox={spiky ? '-8 -8 116 116' : '0 0 100 100'} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-ball`} cx="36%" cy="32%" r="72%">
          <stop offset="0" stopColor={light} />
          <stop offset="0.55" stopColor={mid} />
          <stop offset="1" stopColor={dark} />
        </radialGradient>
        <radialGradient id={`${id}-core`}>
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#9ef4ff" />
        </radialGradient>
      </defs>
      {spiky && <Mark kind="spike" id={id} />}
      {kind === 'axe' && (
        <g>
          <rect x="47" y="-2" width="6" height="34" rx="2" fill="#6b4325" stroke="#2e1a0c" strokeWidth="1.5" transform="rotate(14 50 30)" />
          <path d="M56 2 Q74 6 72 22 Q64 16 54 18 Z" fill="#dfe6ee" stroke="#4a5160" strokeWidth="2" strokeLinejoin="round" transform="rotate(14 50 30)" />
        </g>
      )}
      <circle cx="50" cy="50" r="42" fill={`url(#${id}-ball)`} stroke="#0e1830" strokeWidth="3.5" />
      {!spiky && <Mark kind={kind} id={id} />}
      <ellipse cx="36" cy="28" rx="11" ry="6" fill="#fff" opacity="0.35" transform="rotate(-25 36 28)" />
    </svg>
  );
}
