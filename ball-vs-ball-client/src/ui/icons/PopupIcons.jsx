import React, { useId } from 'react';

// Icons for the Daily Rewards, Store, Inventory and Emotes windows (inline SVG, like Icons.jsx).

function CoinDefs({ id }) {
  return (
    <defs>
      <linearGradient id={`${id}-face`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff07a" /><stop offset="0.55" stopColor="#ffd21f" /><stop offset="1" stopColor="#e8a400" />
      </linearGradient>
      <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f0b000" /><stop offset="1" stopColor="#a86a00" />
      </linearGradient>
    </defs>
  );
}

/** One gold coin seen at an angle: its edge, then its face. */
function Coin({ id, x, y, r = 22, tilt = 0.45, angle = 0 }) {
  return (
    <g transform={`rotate(${angle} ${x} ${y})`}>
      <ellipse cx={x} cy={y + 6} rx={r} ry={r * tilt} fill={`url(#${id}-edge)`} stroke="#6a4200" strokeWidth="1.5" />
      <rect x={x - r} y={y} width={r * 2} height="6" fill={`url(#${id}-edge)`} />
      <ellipse cx={x} cy={y} rx={r} ry={r * tilt} fill={`url(#${id}-face)`} stroke="#a86a00" strokeWidth="1.5" />
      <ellipse cx={x} cy={y} rx={r * 0.68} ry={r * tilt * 0.68} fill="none" stroke="#e8a400" strokeWidth="2" />
    </g>
  );
}

/** A coin reward: a stack with two coins leaning on it (`big`: the 150-coin heap). `claimed` dims it to olive. */
export function CoinStackIcon({ className, big = false, claimed = false }) {
  const id = useId().replace(/:/g, '');
  const stack = (x, y, count) => Array.from({ length: count }, (_, i) => <Coin key={`${x}-${i}`} id={id} x={x} y={y - i * 8} />);
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true" style={claimed ? { filter: 'saturate(0.35) brightness(0.55)' } : undefined}>
      <CoinDefs id={id} />
      {big ? (
        <>
          {stack(36, 46, 5)}{stack(66, 40, 5)}
          {stack(30, 82, 3)}{stack(60, 86, 4)}
          <Coin id={id} x={82} y={64} angle={70} r={18} />
          <Coin id={id} x={18} y={60} angle={-70} r={17} />
        </>
      ) : (
        <>
          {stack(44, 78, 6)}
          <Coin id={id} x={72} y={56} angle={70} r={20} />
          <Coin id={id} x={58} y={84} r={18} />
        </>
      )}
    </svg>
  );
}

export function LockIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 40 48" aria-hidden="true">
      <path d="M11 22 V14 A9 9 0 0 1 29 14 V22" fill="none" stroke="#0b0d12" strokeWidth="9" />
      <path d="M11 22 V14 A9 9 0 0 1 29 14 V22" fill="none" stroke="#fff" strokeWidth="5" />
      <rect x="4" y="20" width="32" height="25" rx="4" fill="#fff" stroke="#0b0d12" strokeWidth="2.5" />
      <path d="M20 29 V36" stroke="#0b0d12" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 48 40" aria-hidden="true">
      <path d="M6 22 L18 33 L42 7" fill="none" stroke="#0b0d12" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 22 L18 33 L42 7" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The bux price mark: a white hexagon round a ring (as on the store's price buttons). */
export function BuxMark({ className }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 2.5 L27.7 9.2 V22.8 L16 29.5 L4.3 22.8 V9.2 Z" fill="none" stroke="#0b0d12" strokeWidth="6" strokeLinejoin="round" />
      <path d="M16 2.5 L27.7 9.2 V22.8 L16 29.5 L4.3 22.8 V9.2 Z" fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
      <path d="M16 10 L21.2 13 V19 L16 22 L10.8 19 V13 Z" fill="#fff" stroke="#0b0d12" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// ---- Tab pictures (they stand up out of the top of their tab) ---------------------------------------

export function EventsIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <g fill="#fff" stroke="#cfe0ff" strokeWidth="1">
        <rect x="6" y="6" width="23" height="23" rx="6" /><rect x="35" y="6" width="23" height="23" rx="6" />
        <rect x="6" y="35" width="23" height="23" rx="6" /><rect x="35" y="35" width="23" height="23" rx="6" />
      </g>
    </svg>
  );
}

/** The red ball with two white horns (the Balls tab). */
export function HornBallIcon({ className }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={className} viewBox="0 0 100 110" aria-hidden="true">
      <defs>
        <radialGradient id={id} cx="40%" cy="36%" r="70%">
          <stop offset="0" stopColor="#ff6a6a" /><stop offset="0.6" stopColor="#e01818" /><stop offset="1" stopColor="#8a0606" />
        </radialGradient>
      </defs>
      <path d="M30 34 L26 2 L42 30 Z M70 34 L74 2 L58 30 Z" fill="#fff" stroke="#c9ccd6" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="50" cy="66" r="40" fill={`url(#${id})`} />
    </svg>
  );
}

/** Cyan paint splash (the Explosions tab). */
export function SplashIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 120 80" aria-hidden="true">
      <g fill="#3fc8ff">
        <path d="M30 48 Q24 26 46 28 Q50 8 68 18 Q86 6 92 26 Q112 30 100 48 Q108 66 86 62 Q76 78 60 66 Q40 76 36 60 Q18 62 30 48 Z" />
        <circle cx="16" cy="40" r="5" /><circle cx="108" cy="18" r="4" /><circle cx="112" cy="62" r="5" /><circle cx="10" cy="62" r="3" />
        <circle cx="56" cy="6" r="3.5" /><circle cx="22" cy="20" r="3" />
      </g>
      <g fill="#a6ecff" opacity="0.8"><circle cx="58" cy="36" r="9" /><circle cx="80" cy="44" r="6" /></g>
    </svg>
  );
}

/** A flying saucer with its glass dome and a yellow light under it (the Flyers tab, and Flyer slots). */
export function UfoIcon({ className, beam = true }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={className} viewBox="0 0 120 100" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-hull`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#9aa6b8" />
        </linearGradient>
        <radialGradient id={`${id}-dome`} cx="40%" cy="30%" r="80%">
          <stop offset="0" stopColor="#d6fbff" /><stop offset="0.6" stopColor="#3fd0f0" /><stop offset="1" stopColor="#1a7aa8" />
        </radialGradient>
      </defs>
      {beam && <path d="M48 62 L40 98 H80 L72 62 Z" fill="#ffd23a" opacity="0.75" />}
      <path d="M38 36 A22 22 0 0 1 82 36 Z" fill={`url(#${id}-dome)`} stroke="#2a4a6a" strokeWidth="1.5" />
      <ellipse cx="60" cy="48" rx="54" ry="15" fill={`url(#${id}-hull)`} stroke="#5a6478" strokeWidth="1.5" />
      <ellipse cx="60" cy="42" rx="34" ry="6" fill="#e8eef6" />
      <g fill="#5a6478"><circle cx="30" cy="51" r="4" /><circle cx="60" cy="55" r="4" /><circle cx="90" cy="51" r="4" /></g>
    </svg>
  );
}

/** Two arrows round a cube (the Fusion tab). */
export function FusionIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 80 80" aria-hidden="true">
      <g fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round">
        <path d="M66 32 A28 28 0 0 0 18 20" />
        <path d="M14 48 A28 28 0 0 0 62 60" />
      </g>
      <path d="M8 10 L26 12 L12 28 Z M72 70 L54 68 L68 52 Z" fill="#fff" />
      <path d="M40 24 L54 31 V47 L40 54 L26 47 V31 Z" fill="#fff" />
      <path d="M26 31 L40 38 L54 31 M40 38 V54" fill="none" stroke="#2a5fb0" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

// ---- Store pictures ------------------------------------------------------------------------------------

/** "Thornbeam Amber": an orange starburst with a white-hot middle. */
export function StarburstIcon({ className }) {
  const id = useId().replace(/:/g, '');
  const rays = Array.from({ length: 22 }, (_, i) => {
    const a = (i / 22) * Math.PI * 2;
    const long = i % 2 ? 30 : 46 + (i % 3) * 3;
    const tip = [60 + Math.cos(a) * long, 50 + Math.sin(a) * long];
    const side = (s) => [60 + Math.cos(a + s) * 6, 50 + Math.sin(a + s) * 6];
    return `M${side(-0.35).join(' ')} L${tip.join(' ')} L${side(0.35).join(' ')} Z`;
  });
  return (
    <svg className={className} viewBox="0 0 120 100" aria-hidden="true">
      <defs>
        <radialGradient id={id}>
          <stop offset="0" stopColor="#ffffff" /><stop offset="0.25" stopColor="#ffe9b0" /><stop offset="0.6" stopColor="#ff9a2a" stopOpacity="0.7" />
          <stop offset="1" stopColor="#ff5a00" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g fill="#ff8a1a">{rays.map((d) => <path key={d} d={d} />)}</g>
      <g fill="#ffd9a0" transform="rotate(8 60 50) scale(0.7) translate(25.7 21.4)">{rays.map((d) => <path key={d} d={d} />)}</g>
      <circle cx="60" cy="50" r="24" fill={`url(#${id})`} />
    </svg>
  );
}

/** "67": chunky gold numbers with an orange glow. */
export function SixtySevenIcon({ className }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={className} viewBox="0 0 160 110" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff2a0" /><stop offset="0.5" stopColor="#ffbf1a" /><stop offset="1" stopColor="#e07800" />
        </linearGradient>
      </defs>
      <text x="80" y="92" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="104" letterSpacing="-6"
        fill="none" stroke="#ff7a00" strokeWidth="14" strokeLinejoin="round" opacity="0.45">67</text>
      <text x="80" y="92" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="104" letterSpacing="-6"
        fill={`url(#${id})`} stroke="#3a1a00" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke">67</text>
    </svg>
  );
}

/** The Lightwing bundle: a violet whirl, the ball in its hex frame, and a pair of crystal wings. */
export function LightwingArt({ className }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={className} viewBox="0 0 650 250" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor="#e6ccff" /><stop offset="0.4" stopColor="#a060ff" stopOpacity="0.6" /><stop offset="1" stopColor="#4a1a90" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-wing`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0e8ff" /><stop offset="0.5" stopColor="#9a8ad8" /><stop offset="1" stopColor="#3a2a70" />
        </linearGradient>
      </defs>
      {/* The whirl (explosion) */}
      <circle cx="120" cy="140" r="110" fill={`url(#${id}-glow)`} opacity="0.7" />
      <g fill="none" stroke="#d0b0ff" strokeLinecap="round" opacity="0.9">
        <path d="M30 60 L80 110 L60 120 L130 190" strokeWidth="4" />
        <path d="M200 30 L150 100 L175 105 L120 200" strokeWidth="3" />
        <ellipse cx="120" cy="150" rx="70" ry="24" strokeWidth="5" transform="rotate(-12 120 150)" />
        <ellipse cx="120" cy="150" rx="46" ry="15" strokeWidth="3" transform="rotate(-12 120 150)" />
        <path d="M120 40 V230" strokeWidth="2" opacity="0.6" />
      </g>
      {/* The ball */}
      <g transform="translate(330 110)">
        <circle r="110" fill={`url(#${id}-glow)`} opacity="0.55" />
        <path d="M-58 -96 L-26 -70 L26 -70 L58 -96 L78 -20 L70 40 L30 92 L-30 92 L-70 40 L-78 -20 Z" fill="#d8d4e6" stroke="#3a3550" strokeWidth="4" strokeLinejoin="round" />
        <path d="M-40 -60 L40 -60 L62 -10 L56 40 L24 74 L-24 74 L-56 40 L-62 -10 Z" fill="#26223a" stroke="#7a7490" strokeWidth="3" strokeLinejoin="round" />
        <circle cy="8" r="48" fill="none" stroke="#7a3ad0" strokeWidth="16" opacity="0.6" />
        <circle cy="8" r="48" fill="none" stroke="#e0c8ff" strokeWidth="7" />
        <circle cy="8" r="26" fill="none" stroke="#b088ff" strokeWidth="5" />
      </g>
      {/* The wings (flyer) */}
      <g stroke="#2a1f50" strokeWidth="2" strokeLinejoin="round" fill={`url(#${id}-wing)`}>
        <path d="M470 200 L620 20 L600 70 L640 60 L590 120 L630 120 L560 170 Z" />
        <path d="M480 210 L560 60 L556 110 L590 100 L540 170 Z" opacity="0.85" />
        <path d="M470 200 L640 150 L560 200 Z" opacity="0.7" />
      </g>
    </svg>
  );
}

// ---- Emotes ----------------------------------------------------------------------------------------------

const POSES = {
  // [left arm, right arm, left leg, right leg] angles in degrees (0 = hanging down; positive swings outward).
  cheer: [160, 160, 8, 8],
  flex: [100, 100, 6, 6],
  wave: [10, 150, 4, 4],
  stand: [8, 8, 2, 2],
  point: [6, 100, 4, 18],
  dance: [130, 40, 20, -6],
};

/** A blocky stone-grey figure striking an emote's pose. */
export function EmoteFigure({ className, pose = 'stand' }) {
  const [la, ra, ll, rl] = POSES[pose] ?? POSES.stand;
  const limb = (x, y, angle, w, h, side) => (
    <rect x={x - w / 2} y={y} width={w} height={h} rx="2" transform={`rotate(${side * angle} ${x} ${y + 3})`} />
  );
  return (
    <svg className={className} viewBox="0 0 100 130" aria-hidden="true">
      <g fill="#b9ab98" stroke="#7d705f" strokeWidth="1.5">
        {limb(38, 76, ll, 15, 44, 1)}
        {limb(62, 76, rl, 15, 44, -1)}
        {limb(26, 38, la, 14, 40, 1)}
        {limb(74, 38, ra, 14, 40, -1)}
        <rect x="32" y="36" width="36" height="42" rx="3" fill="#c3b6a3" />
        <rect x="36" y="8" width="28" height="28" rx="7" fill="#c9bca9" />
      </g>
      <g fill="#3a332a"><circle cx="45" cy="20" r="1.8" /><circle cx="55" cy="20" r="1.8" /></g>
      <path d="M44 27 Q50 31 56 27" fill="none" stroke="#3a332a" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
