import React, { useId } from 'react';

// The duel balls as HUD icons (inline SVG, drawn after the reference's ball pictures): a shaded sphere with a
// dark outline and each kind's mark. `kind` 'unknown' is the grey "?" ball shown before a player's choice is
// revealed.

const SHADES = {
  verity: ['#fff79a', '#f5e21c', '#c9a80a'],
  axe: ['#8c93a3', '#4b5160', '#20242e'],
  thief: ['#c3c9f7', '#7c86d4', '#454d93'],
  burst: ['#ffb070', '#f2661c', '#b8380a'],
  cell: ['#c6f5a8', '#5fcf62', '#2c8a3a'],
  charge: ['#a6f8f0', '#35d6c8', '#16877e'],
  electric: ['#7cc0ff', '#1f86e6', '#0d4ea3'],
  spider: ['#e0505a', '#b3202a', '#6a0f16'],
  unknown: ['#c4c9d2', '#868c97', '#4a4f59'],
};

/** A cobweb round the middle: `spokes` threads and four sagging rings. */
function Web({ spokes = 8, radius = 36 }) {
  const angles = Array.from({ length: spokes + 1 }, (_, i) => (i / spokes) * Math.PI * 2);
  const at = (a, d) => `${50 + Math.cos(a) * d} ${50 + Math.sin(a) * d}`;
  return (
    <g fill="none" stroke="#fff" strokeLinejoin="round">
      {angles.slice(0, spokes).map((a) => <path key={a} d={`M50 50 L${at(a, radius)}`} strokeWidth="3.4" />)}
      {[0.24, 0.48, 0.72, 0.96].map((ring) => (
        <path
          key={ring}
          strokeWidth="3"
          d={angles.map((a, i) => (i ? `Q${at(a - Math.PI / spokes, ring * radius * 0.8)} ${at(a, ring * radius)}` : `M${at(a, ring * radius)}`)).join(' ')}
        />
      ))}
    </g>
  );
}

function Mark({ kind, id }) {
  switch (kind) {
    case 'verity':
      return (
        <>
          <ellipse cx="40" cy="37" rx="5" ry="9" fill="#1a1708" />
          <ellipse cx="60" cy="37" rx="5" ry="9" fill="#1a1708" />
          <path d="M24 52 Q50 82 76 52" fill="none" stroke="#1a1708" strokeWidth="5" strokeLinecap="round" />
          <path d="M21 47 L27 56 M79 47 L73 56" stroke="#1a1708" strokeWidth="3.5" strokeLinecap="round" />
        </>
      );
    case 'axe':
      return (
        <>
          <path d="M60 10 Q72 50 60 90" fill="none" stroke="#ff5a10" strokeWidth="11" strokeLinecap="round" opacity="0.4" />
          <path d="M60 10 Q72 50 60 90" fill="none" stroke="#ffae4a" strokeWidth="4.5" strokeLinecap="round" />
        </>
      );
    case 'thief':
      return (
        <>
          {/* The mask: a dark band across the face, its knot at the left. */}
          <path d="M9 56 L82 22 Q90 32 91 40 L14 72 Q9 64 9 56 Z" fill="#23263f" />
          <rect x="4" y="54" width="11" height="13" rx="2" fill="#23263f" transform="rotate(-24 9 60)" />
          <path d="M50 46 L80 30 L72 46 Z" fill="#fff" />
          <path d="M50 46 L80 30 L72 46 Z" fill="none" stroke="#c9d4ff" strokeWidth="1.5" opacity="0.8" />
        </>
      );
    case 'burst':
      return <path d="M41 22 H59 V41 H78 V59 H59 V78 H41 V59 H22 V41 H41 Z" fill="#ffd23a" stroke="#e39a10" strokeWidth="2" strokeLinejoin="round" />;
    case 'cell':
      return (
        <>
          <circle cx="50" cy="50" r="31" fill="#8fe07a" opacity="0.55" />
          <circle cx="44" cy="44" r="18" fill="#c4f28a" opacity="0.9" />
          <circle cx="39" cy="39" r="7" fill="#f0ffd0" />
          <circle cx="64" cy="58" r="6" fill="#a8ec8a" />
        </>
      );
    case 'charge':
      return (
        <>
          <circle cx="50" cy="50" r="27" fill="#262b52" />
          <circle cx="50" cy="50" r="17" fill={`url(#${id}-core)`} />
        </>
      );
    case 'electric':
      return <path d="M60 14 L30 56 L47 56 L38 88 L72 42 L54 42 L66 14 Z" fill={`url(#${id}-bolt)`} strokeLinejoin="round" />;
    case 'spider':
      return <Web />;
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
  return (
    <svg className={className} viewBox={kind === 'axe' ? '-15 -32 130 130' : '0 0 100 100'} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-ball`} cx="38%" cy="34%" r="70%">
          <stop offset="0" stopColor={light} />
          <stop offset="0.6" stopColor={mid} />
          <stop offset="1" stopColor={dark} />
        </radialGradient>
        <radialGradient id={`${id}-core`}>
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#9ef4ff" />
        </radialGradient>
        <linearGradient id={`${id}-bolt`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#8fe4ff" />
        </linearGradient>
        <clipPath id={`${id}-clip`}><circle cx="50" cy="50" r="42" /></clipPath>
      </defs>
      {kind === 'axe' && (
        <g>
          {/* The axe stands up out of the ball's top (the picture is framed taller for it): a wooden handle, the
              steel head to the right. */}
          <rect x="46.5" y="-30" width="7" height="40" rx="2" fill="#8a5a30" stroke="#2e1a0c" strokeWidth="1.5" />
          <path d="M54 -28 Q78 -24 75 -4 Q67 -12 54 -10 Z" fill="#e3e9f0" stroke="#4a5160" strokeWidth="2" strokeLinejoin="round" />
        </g>
      )}
      <circle cx="50" cy="50" r="42" fill={`url(#${id}-ball)`} stroke="#0e1424" strokeWidth="3" />
      <g clipPath={`url(#${id}-clip)`}><Mark kind={kind} id={id} /></g>
      <ellipse cx="36" cy="27" rx="11" ry="6" fill="#fff" opacity="0.3" transform="rotate(-25 36 27)" />
    </svg>
  );
}
