import React from 'react';

// The Inventory's other balls (shared/catalog.js), drawn like BallIcon's duel balls: each kind's sphere shades,
// its mark on the sphere, and what stands behind or in front of it. BallIcon puts these together.

export const EXTRA_SHADES = {
  bomb: ['#8a5aa8', '#4a1f6a', '#200a33'],
  potion: ['#f39cff', '#c020e0', '#6a0a88'],
  cannon: ['#6a6a6e', '#3a3a3e', '#1a1a1c'],
  lightwing: ['#4a4560', '#26223a', '#0e0c18'],
  shackles: ['#f08080', '#c43030', '#6a1010'],
  beam: ['#3fb0b0', '#1d7676', '#0c3c3e'],
  glass: ['#f4f7fa', '#d0d7de', '#9aa3ad'],
  hive: ['#f0c050', '#c8901a', '#7a520a'],
  chess: ['#ffffff', '#ececec', '#a0a0a0'],
  harpoon: ['#4fb0b0', '#1f7070', '#0c3a3c'],
  wdc: ['#4a7ae8', '#1f4ab8', '#0c2266'],
  cactus: ['#a8d060', '#6a9a2a', '#3a5a12'],
  icecone: ['#8fe0ea', '#3fb0c0', '#16707e'],
  conductor: ['#5a5e66', '#34373e', '#16181c'],
  shuriken: ['#ffffff', '#d8d8dc', '#8a8a90'],
  fibonacci: ['#3a4f8a', '#1c2a5c', '#0a1230'],
  apple: ['#ff6a6a', '#e01a1a', '#7a0808'],
  dice: ['#ff9a5a', '#e0501a', '#8a2408'],
  frost: ['#a6e0ff', '#4aa0d8', '#1a5a8a'],
  blade: ['#5a6070', '#33373f', '#15171c'],
  zone: ['#ff6a6a', '#d81818', '#7a0606'],
  bigspike: ['#ffffff', '#dcdcdc', '#a0a0a6'],
  bow: ['#d8a070', '#a0642a', '#5a320a'],
  machinegun: ['#9aa0aa', '#5a606a', '#25282e'],
  ray: ['#fff2a0', '#ffd21a', '#c08a00'],
  electroking: ['#3a6ae0', '#1a3aa8', '#0a1a5a'],
  range: ['#5a4520', '#2a1f0a', '#120c04'],
  acid: ['#9ae07a', '#4aa83a', '#1f5e1a'],
};

// Pictures with parts beyond the ball are framed wider.
export const EXTRA_VIEW = {
  bomb: '-6 -14 112 112', potion: '-14 -14 128 128', lightwing: '-22 -22 144 144', beam: '-15 -32 130 130',
  harpoon: '-18 -28 128 128', cactus: '-14 -22 128 128', apple: '-8 -18 116 116', blade: '-15 -32 130 130',
  machinegun: '-6 -10 124 124', ray: '-14 -14 128 128', zone: '-6 -6 112 112',
};

/** Balls drawn whole by `ExtraFront` (no plain sphere under them). */
export const NO_SPHERE = new Set(['orbit', 'reforge']);

const at = (a, d) => [50 + Math.cos(a) * d, 50 + Math.sin(a) * d];
const around = (n, offset = 0) => Array.from({ length: n }, (_, i) => (i / n) * Math.PI * 2 + offset);
const spike = (a, from, to, half) => `M${at(a - half, from).join(' ')} L${at(a, to).join(' ')} L${at(a + half, from).join(' ')} Z`;

/** The Hive Ball's honeycomb. */
function Honeycomb() {
  const cells = [];
  for (let row = -3; row <= 3; row += 1) {
    for (let col = -3; col <= 3; col += 1) cells.push([50 + col * 17 + (row % 2 ? 8.5 : 0), 50 + row * 15]);
  }
  const hex = ([x, y]) => around(6, Math.PI / 6).map((a) => `${x + Math.cos(a) * 9.5} ${y + Math.sin(a) * 9.5}`).join(' L');
  return cells.map((cell) => <path key={cell.join()} d={`M${hex(cell)} Z`} fill="#e8b440" stroke="#8a5a0a" strokeWidth="2.5" opacity="0.85" />);
}

/** The mark on the sphere (clipped to it). */
export function ExtraMark({ kind }) {
  switch (kind) {
    case 'bomb':
      return (
        <g fill="#fff">
          <path d="M18 46 L46 58 Q42 72 30 68 Q18 62 18 46 Z" />
          <path d="M82 46 L54 58 Q58 72 70 68 Q82 62 82 46 Z" />
        </g>
      );
    case 'potion':
      return <path d="M50 14 Q54 46 86 50 Q54 54 50 86 Q46 54 14 50 Q46 46 50 14 Z" fill="#fff" />;
    case 'cannon':
      return (
        <>
          <circle cx="50" cy="50" r="26" fill="none" stroke="#e41a1a" strokeWidth="9" strokeDasharray="30 10.8" transform="rotate(-25 50 50)" />
          <circle cx="50" cy="50" r="9" fill="#e41a1a" />
        </>
      );
    case 'lightwing':
      return (
        <>
          <path d="M50 14 L80 30 L80 70 L50 86 L20 70 L20 30 Z" fill="none" stroke="#c9c4dc" strokeWidth="4" opacity="0.8" />
          <circle cx="50" cy="50" r="25" fill="none" stroke="#7a3ad0" strokeWidth="9" opacity="0.6" />
          <circle cx="50" cy="50" r="25" fill="none" stroke="#c99aff" strokeWidth="4" />
          <circle cx="50" cy="50" r="13" fill="none" stroke="#9a6ae0" strokeWidth="3" />
        </>
      );
    case 'shackles':
      return (
        <g fill="none" strokeLinecap="round" opacity="0.8">
          <path d="M14 30 Q50 52 86 34 M12 62 Q50 40 88 66 M30 12 Q46 50 34 90" stroke="#3a0808" strokeWidth="5" />
          <path d="M54 40 L68 58 M62 38 L76 54 M70 34 L82 48" stroke="#f4b0b0" strokeWidth="3" />
        </g>
      );
    case 'beam':
      return (
        <>
          <path d="M42 20 H58 L48 46 H60 L44 82" fill="none" stroke="#2ff0ff" strokeWidth="10" strokeLinejoin="round" opacity="0.35" />
          <path d="M42 20 H58 L48 46 H60 L44 82" fill="none" stroke="#9ffaff" strokeWidth="4" strokeLinejoin="round" />
        </>
      );
    case 'glass':
      return (
        <g fill="none" stroke="#ffffff" strokeWidth="2">
          <path d={`M${around(12).map((a) => at(a, 40).join(' ')).join(' L')} Z`} stroke="#a8b2bc" strokeWidth="3" />
          <path d="M30 30 L50 22 L70 32 M30 30 L36 56 L62 60 L70 32 M36 56 L50 78 L62 60" opacity="0.5" />
        </g>
      );
    case 'hive':
      return <Honeycomb />;
    case 'chess':
      return (
        <g fill="#141414">
          {Array.from({ length: 49 }, (_, i) => i).filter((i) => i % 2 === 0).map((i) => (
            <rect key={i} x={(i % 7) * 15 - 2.5} y={Math.floor(i / 7) * 15 - 2.5} width="15" height="15" />
          ))}
        </g>
      );
    case 'harpoon':
      return <path d="M50 14 L74 44 L60 44 L60 84 L40 84 L40 44 L26 44 Z" fill="#a8f4f4" opacity="0.75" />;
    case 'wdc':
      return <path d="M36 8 Q30 50 36 92 M64 8 Q70 50 64 92 M8 38 Q50 32 92 38 M8 64 Q50 70 92 64" fill="none" stroke="#a9c6ff" strokeWidth="5" />;
    case 'icecone':
      return (
        <g fill="none" stroke="#e9fbff" strokeWidth="4" strokeLinecap="round">
          {around(6, Math.PI / 2).map((a) => {
            const branch = at(a, 22).join(' ');
            return <path key={a} d={`M50 50 L${at(a, 34).join(' ')} M${branch} L${at(a + 0.45, 30).join(' ')} M${branch} L${at(a - 0.45, 30).join(' ')}`} />;
          })}
        </g>
      );
    case 'conductor':
      return (
        <>
          <circle cx="50" cy="50" r="33" fill="none" stroke="#6a6e78" strokeWidth="3" />
          {around(8, Math.PI / 8).map((a) => <circle key={a} cx={at(a, 27)[0]} cy={at(a, 27)[1]} r="3.4" fill="#9a9ea8" />)}
          <rect x="30" y="43" width="40" height="14" rx="2" fill="#e01a1a" stroke="#f2f2f2" strokeWidth="3" />
        </>
      );
    case 'shuriken':
      return (
        <>
          <path d="M50 8 Q56 40 92 50 Q56 60 50 92 Q44 60 8 50 Q44 40 50 8 Z" fill="#2a2a30" transform="rotate(20 50 50)" />
          <circle cx="50" cy="50" r="10" fill="#d8d8dc" />
        </>
      );
    case 'fibonacci':
      return (
        <g fill="none" stroke="#c9a54a" strokeWidth="6" strokeLinecap="round">
          <ellipse cx="50" cy="44" rx="18" ry="14" />
          <path d="M50 20 V82" />
        </g>
      );
    case 'dice':
      return (
        <g opacity="0.45">
          <rect x="22" y="38" width="30" height="30" rx="6" fill="#ffd6c0" transform="rotate(-18 37 53)" />
          <rect x="48" y="30" width="30" height="30" rx="6" fill="#ffd6c0" transform="rotate(14 63 45)" />
          <g fill="#8a2408">
            <circle cx="33" cy="48" r="3" /><circle cx="41" cy="58" r="3" /><circle cx="58" cy="38" r="3" /><circle cx="68" cy="52" r="3" /><circle cx="63" cy="45" r="3" />
          </g>
        </g>
      );
    case 'frost':
      return (
        <g stroke="#cdeeff" fill="#cdeeff" strokeLinecap="round" opacity="0.7">
          <path d="M28 28 L72 72 M72 28 L28 72" strokeWidth="16" />
          <path d="M50 30 L70 50 L50 70 L30 50 Z" strokeWidth="2" />
        </g>
      );
    case 'blade':
      return (
        <>
          <path d="M50 30 V92" stroke="#2ad8ff" strokeWidth="11" opacity="0.35" />
          <path d="M50 30 V92" stroke="#9cf2ff" strokeWidth="4" />
        </>
      );
    case 'zone':
      return <circle cx="50" cy="50" r="36" fill="none" stroke="#ffd6d6" strokeWidth="4" opacity="0.85" />;
    case 'bow':
      return (
        <g fill="none" strokeLinecap="round">
          <path d="M36 16 Q76 50 36 84" stroke="#4a2808" strokeWidth="6" />
          <path d="M36 16 V84" stroke="#fff" strokeWidth="2" />
          <path d="M28 50 H78 M70 43 L78 50 L70 57" stroke="#f2f2f2" strokeWidth="3.5" />
        </g>
      );
    case 'machinegun':
      return <path d="M10 44 H90 V56 H10 Z" fill="#25282e" opacity="0.65" />;
    case 'ray':
      return <circle cx="50" cy="50" r="18" fill="#fffbe0" opacity="0.8" />;
    case 'electroking':
      return (
        <>
          <circle cx="50" cy="50" r="38" fill="none" stroke="#9ad8ff" strokeWidth="5" />
          <path d="M34 36 L40 24 L50 34 L60 24 L66 36 Z" fill="#ffd23a" stroke="#8a6a00" strokeWidth="2" strokeLinejoin="round" />
        </>
      );
    case 'range':
      return (
        <>
          <circle cx="50" cy="50" r="27" fill="#e2b412" />
          <ellipse cx="42" cy="40" rx="9" ry="5" fill="#fff3a6" opacity="0.6" transform="rotate(-25 42 40)" />
        </>
      );
    case 'acid':
      return (
        <g fill="#2f7a26" opacity="0.6">
          <circle cx="66" cy="34" r="12" /><circle cx="36" cy="64" r="9" /><circle cx="62" cy="68" r="6" /><circle cx="30" cy="36" r="5" /><circle cx="76" cy="58" r="4" />
        </g>
      );
    default:
      return null;
  }
}

/** What stands behind or around the ball: wings, beams, poles, spikes, rays. */
export function ExtraBehind({ kind }) {
  switch (kind) {
    case 'lightwing':
      return (
        <g fill="#b9b4cc" stroke="#4a4560" strokeWidth="2" strokeLinejoin="round">
          <path d="M14 20 L-18 -6 L-8 30 L-20 44 L6 50 Z" />
          <path d="M86 20 L118 -6 L108 30 L120 44 L94 50 Z" />
          <path d="M14 80 L-12 104 L4 72 Z M86 80 L112 104 L96 72 Z" fill="#8a85a0" />
        </g>
      );
    case 'beam':
      return <rect x="38" y="-32" width="24" height="44" fill="#7ff6ff" opacity="0.55" />;
    case 'harpoon':
      return (
        <g>
          <path d="M8 96 V-10" stroke="#9fe8ec" strokeWidth="5" />
          <path d="M8 -26 L18 -6 L8 -10 L-2 -6 Z" fill="#c9fbff" />
        </g>
      );
    case 'cactus':
      return (
        <g fill="#d8c447" stroke="#7a6a10" strokeWidth="1">
          {around(10, 0.3).map((a) => <path key={a} d={spike(a, 40, 54, 0.1)} />)}
        </g>
      );
    case 'blade':
      return (
        <g>
          <rect x="47" y="-6" width="6" height="18" rx="1.5" fill="#6a4a2a" stroke="#2e1a0c" strokeWidth="1.5" />
          <path d="M50 -32 L56 -10 L44 -10 Z" fill="#dfe6ee" stroke="#4a5160" strokeWidth="1.5" strokeLinejoin="round" />
          <rect x="42" y="-8" width="16" height="4" rx="1" fill="#3a3e48" />
        </g>
      );
    case 'machinegun':
      return <rect x="60" y="42" width="56" height="16" rx="3" fill="#3a3e48" stroke="#14161a" strokeWidth="2" />;
    case 'ray':
      return <g fill="#ffd21a" opacity="0.85">{around(10).map((a) => <path key={a} d={spike(a, 40, 62, 0.15)} />)}</g>;
    case 'zone':
      return <circle cx="50" cy="50" r="49" fill="none" stroke="#ffb0b0" strokeWidth="6" opacity="0.45" />;
    default:
      return null;
  }
}

const ORBIT = ['#ffa8d0', '#e05a9a', '#8a1f55'];
const GOLD = ['#fff08a', '#f0c81a', '#a07a08'];
const Shade = ({ id, colors: [light, mid, dark] }) => (
  <radialGradient id={id} cx="38%" cy="34%" r="70%">
    <stop offset="0" stopColor={light} /><stop offset="0.6" stopColor={mid} /><stop offset="1" stopColor={dark} />
  </radialGradient>
);

/** What sits in front of the ball, past its outline (fuses, bottles, stems, flowers), and the whole-picture balls. */
export function ExtraFront({ kind, id }) {
  switch (kind) {
    case 'bomb':
      return (
        <g>
          <rect x="41" y="2" width="18" height="12" rx="2" fill="#9a9aa2" stroke="#2a2a30" strokeWidth="2" />
          <path d="M50 2 Q52 -6 46 -10" fill="none" stroke="#f2f2f2" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case 'potion': {
      const bottle = (x, y, color, angle) => (
        <g key={color} transform={`rotate(${angle} ${x} ${y})`}>
          <circle cx={x} cy={y} r="10" fill={color} stroke="#ffffff" strokeWidth="1.5" opacity="0.92" />
          <rect x={x - 4} y={y - 17} width="8" height="8" rx="1.5" fill="#8a5a30" stroke="#f2f2f2" strokeWidth="1.2" />
        </g>
      );
      return <>{bottle(22, 6, '#ff9eae', -30)}{bottle(92, 24, '#d4f59a', 60)}{bottle(6, 76, '#a6dcff', -120)}</>;
    }
    case 'cactus':
      return <path d="M38 6 L44 -14 L50 0 L56 -14 L62 6 Z" fill="#b04ad0" stroke="#5a1a70" strokeWidth="1.5" />;
    case 'apple':
      return (
        <g>
          <path d="M48 12 Q46 0 52 -10" fill="none" stroke="#4a2a10" strokeWidth="5" strokeLinecap="round" />
          <path d="M54 2 Q70 -16 88 -6 Q76 12 54 2 Z" fill="#5fcf3a" stroke="#1f6a12" strokeWidth="2" />
        </g>
      );
    case 'orbit':
      return (
        <g>
          <defs><Shade id={`${id}-orbit`} colors={ORBIT} /></defs>
          <circle cx="50" cy="50" r="45" fill="none" stroke="#5a5e6a" strokeWidth="2.5" />
          <circle cx="50" cy="50" r="34" fill="none" stroke="#5a5e6a" strokeWidth="2.5" />
          <circle cx="50" cy="50" r="23" fill={`url(#${id}-orbit)`} stroke="#2a0a1a" strokeWidth="2" />
          <g fill="#ffa8d0"><circle cx="50" cy="5" r="4.5" /><circle cx="22" cy="74" r="4.5" /><circle cx="83" cy="58" r="4" /></g>
        </g>
      );
    case 'reforge':
      return (
        <g stroke="#0e1424" strokeWidth="2.5">
          <defs><Shade id={`${id}-gold`} colors={GOLD} /></defs>
          <circle cx="28" cy="28" r="22" fill={`url(#${id}-gold)`} />
          <path d="M28 14 V40" stroke="#4a3010" strokeWidth="4" />
          <path d="M24 16 L28 4 L32 16 Z" fill="#e3e9f0" strokeWidth="1.5" />
          <circle cx="62" cy="62" r="34" fill={`url(#${id}-gold)`} />
          <path d="M70 48 L50 84" stroke="#6a4010" strokeWidth="6" strokeLinecap="round" />
          <path d="M58 40 L82 54 L76 62 L52 48 Z" fill="#b8bec8" strokeWidth="2" />
        </g>
      );
    default:
      return null;
  }
}
