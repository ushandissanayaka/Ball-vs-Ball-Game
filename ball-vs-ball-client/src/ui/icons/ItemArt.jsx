import React, { useId } from 'react';
import BallIcon from './BallIcon.jsx';
import { SixtySevenIcon, UfoIcon } from './PopupIcons.jsx';

// Pictures for everything the store sells: explosions, flyers, the crates, diamond packs and the Lightwing
// bundle. Inline SVG with soft glows (blur filters) and layered gradients, drawn after the reference's renders.

const uid = () => useId().replace(/:/g, '');
const around = (n, offset = 0) => Array.from({ length: n }, (_, i) => (i / n) * Math.PI * 2 + offset);
const pt = (cx, cy, a, d) => `${(cx + Math.cos(a) * d).toFixed(2)} ${(cy + Math.sin(a) * d).toFixed(2)}`;

/** A blur filter for glows: <Glow id=... blur={4} /> then filter={`url(#id)`}. */
const Glow = ({ id, blur = 4 }) => (
  <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation={blur} />
  </filter>
);

/** Thin rays out of (cx, cy): n spikes from `inner` to `outer` long, each `half` radians wide at the base. */
function Rays({ cx = 50, cy = 50, n, inner, outer, half = 0.06, fill, offset = 0, jitter = 0 }) {
  return (
    <g fill={fill}>
      {around(n, offset).map((a, i) => {
        const long = outer * (1 - jitter * ((i * 7) % 5) / 5);
        return <path key={a} d={`M${pt(cx, cy, a - half, inner)} L${pt(cx, cy, a, long)} L${pt(cx, cy, a + half, inner)} Z`} />;
      })}
    </g>
  );
}

/** Puffs of cloud (smoke, gas, fire): circles merged under one fill, with a darker underside. */
function Puffs({ puffs, light, dark, id }) {
  return (
    <g>
      <defs>
        <radialGradient id={id} cx="40%" cy="30%" r="80%">
          <stop offset="0" stopColor={light} /><stop offset="1" stopColor={dark} />
        </radialGradient>
      </defs>
      {puffs.map(([x, y, r]) => <circle key={`${x}${y}`} cx={x} cy={y} r={r} fill={`url(#${id})`} />)}
    </g>
  );
}

// ---- Explosions -----------------------------------------------------------------------------------------

/** A repeatable pseudo-random 0..1 for scattering sparks and pixels the same way every time. */
const noise = (i) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Flat smoke: a lumpy cloud with darker hollows and a few flecks flying off. */
function Smoke({ id, light, mid, dark }) {
  return (
    <>
      <Puffs id={`${id}p`} light={light} dark={light} puffs={[[46, 52, 19], [62, 40, 16], [68, 60, 15], [52, 68, 14], [34, 40, 12], [30, 62, 11], [74, 28, 8], [44, 30, 10]]} />
      <g fill={dark} opacity="0.5">{[[56, 50, 8], [40, 56, 5], [64, 44, 4], [50, 36, 3.5]].map(([x, y, r]) => <circle key={x} cx={x} cy={y} r={r} />)}</g>
      <g fill={mid}>{[[14, 36, 3.6], [18, 58, 2.6], [86, 24, 3.2], [88, 66, 2.6], [24, 20, 2.2], [10, 48, 1.8], [80, 82, 2.4], [30, 82, 2]].map(([x, y, r]) => <circle key={x + y} cx={x} cy={y} r={r} />)}</g>
    </>
  );
}

/** Stardust: a fuzzy ball of fine needles round a bright heart. */
function Stardust({ id, color, light }) {
  return (
    <>
      <circle cx="50" cy="50" r="40" fill={color} opacity="0.55" filter={`url(#${id}g)`} />
      <Rays n={90} inner={2} outer={42} half={0.016} fill={color} jitter={0.55} />
      <Rays n={60} inner={2} outer={30} half={0.02} fill={light} offset={0.03} jitter={0.4} />
      <Rays n={8} inner={3} outer={34} half={0.05} fill="#ffffff" offset={0.2} />
      <circle cx="50" cy="50" r="8" fill="#ffffff" filter={`url(#${id}s)`} />
    </>
  );
}

/** A flash: a white four-point star in sweeping arcs of colour. */
function Flash({ id, color }) {
  return (
    <>
      <circle cx="50" cy="50" r="34" fill={color} opacity="0.35" filter={`url(#${id}g)`} />
      <g fill="none" stroke={color} strokeLinecap="round" filter={`url(#${id}s)`}>
        <path d="M18 64 Q14 26 54 16" strokeWidth="3.5" />
        <path d="M84 34 Q88 72 48 84" strokeWidth="3" />
        <path d="M26 30 Q50 10 78 26" strokeWidth="1.5" opacity="0.7" />
        <path d="M74 74 Q50 92 22 76" strokeWidth="1.5" opacity="0.7" />
      </g>
      <path d="M50 8 L55 45 L92 50 L55 55 L50 92 L45 55 L8 50 L45 45 Z" fill="#ffffff" filter={`url(#${id}s)`} />
      <path d="M50 18 L53 47 L82 50 L53 53 L50 82 L47 53 L18 50 L47 47 Z" fill="#ffffff" />
      <Rays n={6} inner={4} outer={30} half={0.05} fill="#ffffff" offset={0.4} />
    </>
  );
}

/** Toxic gas: a churning cloud with a skull glaring out of it. */
function ToxicGas({ id, light, mid, dark }) {
  return (
    <>
      <circle cx="50" cy="50" r="40" fill={mid} opacity="0.4" filter={`url(#${id}g)`} />
      <Puffs id={`${id}p`} light={light} dark={mid} puffs={[[30, 54, 15], [64, 42, 17], [50, 70, 15], [72, 66, 12], [38, 32, 12], [20, 70, 8], [80, 28, 9], [58, 22, 8]]} />
      <g fill={light} opacity="0.85">{[[10, 42, 3], [90, 52, 3.4], [16, 88, 2.4], [86, 86, 2.6], [50, 6, 2.2]].map(([x, y, r]) => <circle key={x} cx={x} cy={y} r={r} />)}</g>
      <path d="M36 46 Q36 28 50 28 Q64 28 64 46 Q64 54 58 57 L58 64 L42 64 L42 57 Q36 54 36 46 Z" fill={dark} />
      <g fill={light}>
        <ellipse cx="44" cy="46" rx="5" ry="5.5" /><ellipse cx="56" cy="46" rx="5" ry="5.5" />
        <path d="M48 53 L50 50 L52 53 Z" />
        <rect x="45" y="59" width="2.4" height="5" /><rect x="49" y="59" width="2.4" height="5" /><rect x="53" y="59" width="2.4" height="5" />
      </g>
    </>
  );
}

/** Lightning caught in a dark glass sphere, its rim glowing. */
function LightningSphere({ id, color, light, seed }) {
  const bolts = Array.from({ length: 7 }, (_, b) => {
    let x = 50 + (noise(seed + b) - 0.5) * 30;
    let y = 50 + (noise(seed + b * 3) - 0.5) * 30;
    const points = [`${x.toFixed(1)} ${y.toFixed(1)}`];
    for (let k = 0; k < 6; k += 1) {
      x += (noise(seed + b * 11 + k) - 0.5) * 22;
      y += (noise(seed + b * 17 + k * 5) - 0.5) * 22;
      x = Math.max(16, Math.min(84, x));
      y = Math.max(16, Math.min(84, y));
      points.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return `M${points.join(' L')}`;
  });
  return (
    <>
      <defs>
        <radialGradient id={`${id}orb`} cx="45%" cy="40%" r="60%">
          <stop offset="0" stopColor="#2a2e3a" /><stop offset="0.8" stopColor="#141820" /><stop offset="1" stopColor={color} stopOpacity="0.7" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="44" fill={color} opacity="0.3" filter={`url(#${id}g)`} />
      <circle cx="50" cy="50" r="38" fill={`url(#${id}orb)`} />
      <g fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" opacity="0.7" filter={`url(#${id}s)`}>{bolts.map((d) => <path key={d} d={d} />)}</g>
      <g fill="none" stroke={light} strokeWidth="1.2" strokeLinejoin="round">{bolts.map((d) => <path key={d} d={d} />)}</g>
      <circle cx="50" cy="50" r="38" fill="none" stroke={light} strokeWidth="1" opacity="0.6" />
      <path d="M50 88 L48 98 M30 84 L22 94 M70 84 L78 92" stroke={light} strokeWidth="1.2" opacity="0.8" />
      <ellipse cx="38" cy="30" rx="10" ry="5" fill="#ffffff" opacity="0.12" transform="rotate(-30 38 30)" />
    </>
  );
}

/** Thornbeam: long thin rays of light out of a white-hot point. */
function Thornbeam({ id, color, light }) {
  return (
    <>
      <circle cx="50" cy="50" r="26" fill={color} opacity="0.55" filter={`url(#${id}g)`} />
      <Rays n={26} inner={3} outer={50} half={0.035} fill={color} jitter={0.55} />
      <Rays n={18} inner={3} outer={34} half={0.05} fill={light} offset={0.12} jitter={0.35} />
      <circle cx="50" cy="50" r="10" fill="#ffffff" filter={`url(#${id}s)`} />
      <circle cx="50" cy="50" r="4.5" fill="#ffffff" />
    </>
  );
}

export function ExplosionIcon({ id: item, className }) {
  const id = uid();
  const body = (() => {
    switch (item) {
      case 'green_smoke': return <Smoke id={id} light="#b8dc3a" mid="#8ab020" dark="#5a7a10" />;
      case 'blue_smoke': return <Smoke id={id} light="#3ad0e8" mid="#1a9ab8" dark="#0c6280" />;
      case 'grey_smoke': return <Smoke id={id} light="#d8dadf" mid="#9a9ca4" dark="#6a6c74" />;
      case 'yellow_smoke': return <Smoke id={id} light="#e8c040" mid="#b8901a" dark="#7a5c08" />;
      case 'pink_stardust': return <Stardust id={id} color="#d870c8" light="#ffc8f4" />;
      case 'golden_stardust': return <Stardust id={id} color="#d0a848" light="#fff0b8" />;
      case 'flash_sky_blue': return <Flash id={id} color="#7ad8f0" />;
      case 'flash_soft_pink': return <Flash id={id} color="#ff8ad8" />;
      case 'thornbeam_amber': return <Thornbeam id={id} color="#ff8a1a" light="#ffd9a0" />;
      case 'thornbeam_violet': return <Thornbeam id={id} color="#b04aff" light="#e8c0ff" />;
      case 'green_toxic_gas': return <ToxicGas id={id} light="#a8f05a" mid="#4aa81a" dark="#1a4a0a" />;
      case 'purple_toxic_gas': return <ToxicGas id={id} light="#e070ff" mid="#9a1ad0" dark="#3a0a50" />;
      case 'voltstrike': return <LightningSphere id={id} color="#e0c878" light="#fff6d0" seed={3} />;
      case 'azure_lightning': return <LightningSphere id={id} color="#5aa8ff" light="#e0f2ff" seed={9} />;
      case 'digital_bombardment':
        return (
          <>
            <circle cx="50" cy="56" r="36" fill="#2a8aff" opacity="0.3" filter={`url(#${id}g)`} />
            <g stroke="#4ab8ff" strokeWidth="1.2" strokeDasharray="2 3" opacity="0.7">
              {[22, 36, 50, 64, 78].map((x) => <path key={x} d={`M${x} 8 V${70 + (x % 3) * 8}`} />)}
            </g>
            <g filter={`url(#${id}s)`}>
              {Array.from({ length: 34 }, (_, i) => {
                const size = 3 + noise(i) * 9;
                const x = 14 + noise(i * 7) * 66;
                const y = 10 + noise(i * 13) * 74;
                const fill = ['#ffffff', '#6ad0ff', '#2a8aff', '#bfe8ff'][i % 4];
                return <rect key={i} x={x} y={y} width={size} height={size} fill={fill} opacity={0.55 + noise(i * 3) * 0.45} />;
              })}
            </g>
            {Array.from({ length: 10 }, (_, i) => (
              <rect key={i} x={20 + noise(i * 19) * 56} y={16 + noise(i * 23) * 60} width="9" height="9" fill="#ffffff" />
            ))}
          </>
        );
      case 'flower_blizzard':
        return (
          <>
            <circle cx="50" cy="50" r="40" fill="#b04aff" opacity="0.45" filter={`url(#${id}g)`} />
            <ellipse cx="50" cy="50" rx="44" ry="20" fill="none" stroke="#e86ad8" strokeWidth="5" transform="rotate(-30 50 50)" opacity="0.7" filter={`url(#${id}s)`} />
            <ellipse cx="50" cy="50" rx="42" ry="16" fill="none" stroke="#ffd0ff" strokeWidth="1.5" transform="rotate(25 50 50)" />
            {around(6, -Math.PI / 2).map((a) => {
              const [x, y] = [50 + Math.cos(a) * 15, 50 + Math.sin(a) * 15];
              return <ellipse key={a} cx={x} cy={y} rx="13" ry="8" fill="#e8ecff" stroke="#9a8ad8" strokeWidth="1.5" transform={`rotate(${(a * 180) / Math.PI} ${x} ${y})`} />;
            })}
            <circle cx="50" cy="50" r="6" fill="#5a4a9a" />
          </>
        );
      case 'devour':
        return (
          <>
            <defs>
              <radialGradient id={`${id}void`}><stop offset="0" stopColor="#05020c" /><stop offset="0.6" stopColor="#2a0e5a" /><stop offset="1" stopColor="#5a2ab0" stopOpacity="0" /></radialGradient>
            </defs>
            <circle cx="50" cy="50" r="46" fill={`url(#${id}void)`} />
            <g fill="none" stroke="#7a4ae0" strokeLinecap="round" opacity="0.8">
              {around(6).map((a) => (
                <path key={a} d={`M${pt(50, 50, a, 8)} Q${pt(50, 50, a + 0.9, 26)} ${pt(50, 50, a + 1.6, 42)}`} strokeWidth="4" />
              ))}
            </g>
            <g fill="#c8a8ff">
              {Array.from({ length: 14 }, (_, i) => {
                const a = noise(i) * Math.PI * 2;
                const d = 14 + noise(i * 5) * 28;
                return <path key={i} d="M0 -5 L2.5 0 L0 5 L-2.5 0 Z" transform={`translate(${pt(50, 50, a, d).replace(' ', ' ')}) rotate(${noise(i * 9) * 180})`} />;
              })}
            </g>
            <circle cx="50" cy="50" r="9" fill="#05020c" />
          </>
        );
      case 'starcross':
        return (
          <>
            <circle cx="50" cy="50" r="38" fill="#2adc8a" opacity="0.35" filter={`url(#${id}g)`} />
            <g stroke="#7affc8" strokeWidth="1.4" opacity="0.8" strokeLinecap="round">
              {Array.from({ length: 18 }, (_, i) => {
                const a = noise(i) * Math.PI * 2;
                return <path key={i} d={`M${pt(50, 50, a, 24 + noise(i * 3) * 10)} L${pt(50, 50, a, 36 + noise(i * 7) * 12)}`} />;
              })}
            </g>
            <path d="M50 6 L58 42 L94 50 L58 58 L50 94 L42 58 L6 50 L42 42 Z" fill="#3affb0" filter={`url(#${id}s)`} opacity="0.8" />
            <path d="M50 10 L57 43 L90 50 L57 57 L50 90 L43 57 L10 50 L43 43 Z" fill="#1a7a5a" stroke="#9affd8" strokeWidth="2" />
            <path d="M50 26 L54 46 L74 50 L54 54 L50 74 L46 54 L26 50 L46 46 Z" fill="#06140e" />
            <g fill="#dafff0">{[[20, 20], [80, 22], [82, 80], [18, 78], [50, 4]].map(([x, y]) => <path key={x} d="M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1 Z" transform={`translate(${x} ${y})`} />)}</g>
          </>
        );
      case 'twin_blades': {
        const sword = (angle, blade, edge, glow) => (
          <g transform={`rotate(${angle} 50 50)`}>
            <path d="M50 4 L55 14 L55 66 L45 66 L45 14 Z" fill={glow} opacity="0.6" filter={`url(#${id}s)`} />
            <path d="M50 6 L54 14 L54 64 L46 64 L46 14 Z" fill={blade} stroke={edge} strokeWidth="1.2" />
            <path d="M50 10 V62" stroke="#ffffff" strokeWidth="1" opacity="0.8" />
            <rect x="38" y="64" width="24" height="5" rx="2" fill="#3a3e4a" stroke="#14161c" strokeWidth="1" />
            <rect x="47" y="69" width="6" height="16" rx="1.5" fill="#5a5e6a" />
            <circle cx="50" cy="88" r="3.5" fill={edge} />
          </g>
        );
        return (
          <>
            <circle cx="50" cy="50" r="40" fill="#5ab0ff" opacity="0.25" filter={`url(#${id}g)`} />
            <path d="M14 62 A38 38 0 0 1 62 13" fill="none" stroke="#ffd21a" strokeWidth="5" strokeLinecap="round" filter={`url(#${id}s)`} />
            <path d="M86 38 A38 38 0 0 1 38 87" fill="none" stroke="#3ab8ff" strokeWidth="5" strokeLinecap="round" filter={`url(#${id}s)`} />
            {sword(-42, '#ffe680', '#c89a00', '#ffd21a')}
            {sword(42, '#bfe6ff', '#2a7ad8', '#3ab8ff')}
          </>
        );
      }
      case 'magic_cube':
        return (
          <>
            <circle cx="50" cy="50" r="40" fill="#ffd21a" opacity="0.3" filter={`url(#${id}g)`} />
            <rect x="14" y="14" width="72" height="72" fill="none" stroke="#e8c020" strokeWidth="3" transform="rotate(-14 50 50)" filter={`url(#${id}s)`} />
            <rect x="14" y="14" width="72" height="72" fill="none" stroke="#fff2a0" strokeWidth="1.5" transform="rotate(-14 50 50)" />
            <rect x="20" y="20" width="60" height="60" fill="none" stroke="#c8a018" strokeWidth="1.2" transform="rotate(10 50 50)" opacity="0.8" />
            <path d="M50 22 L76 34 L76 64 L50 78 L24 64 L24 34 Z" fill="#7a2ad0" />
            <path d="M24 34 L50 46 L50 78 L24 64 Z" fill="#e8c43a" />
            <path d="M50 22 L76 34 L50 46 L24 34 Z" fill="#a050f0" />
            <path d="M50 46 L76 34 L76 64 L50 78 Z" fill="#6a1ab8" />
            <g stroke="#2a0a50" strokeWidth="1.3" fill="none" opacity="0.8">
              <path d="M37 40 L37 71 M24 49 L50 62 M63 40 L63 71 M50 62 L76 49 M37 28 L63 40 M63 28 L37 40" />
            </g>
            <Rays n={10} inner={30} outer={44} half={0.04} fill="#fff2a0" offset={0.3} />
          </>
        );
      case 'hell_shackles':
        return (
          <>
            <circle cx="50" cy="48" r="40" fill="#ff1a1a" opacity="0.3" filter={`url(#${id}g)`} />
            <circle cx="50" cy="48" r="28" fill="none" stroke="#ff2a2a" strokeWidth="6" filter={`url(#${id}s)`} />
            <circle cx="50" cy="48" r="28" fill="none" stroke="#ffb0b0" strokeWidth="1.5" />
            <g fill="none" stroke="#1a0a0a" strokeWidth="3">
              {around(10, 0.2).map((a) => <ellipse key={a} cx={50 + Math.cos(a) * 28} cy={48 + Math.sin(a) * 28} rx="5" ry="3" transform={`rotate(${(a * 180) / Math.PI + 90} ${50 + Math.cos(a) * 28} ${48 + Math.sin(a) * 28})`} />)}
            </g>
            <path d="M18 18 L82 78 M84 16 L20 82" stroke="#2a0606" strokeWidth="4" strokeDasharray="6 3" />
            <g fill="#0a0a0c">
              {Array.from({ length: 12 }, (_, i) => (
                <rect key={i} x={10 + noise(i * 3) * 80} y={8 + noise(i * 5) * 70} width={3 + noise(i) * 6} height={3 + noise(i) * 6} transform={`rotate(${noise(i * 7) * 90} 50 50)`} />
              ))}
            </g>
            <g fill="#ff3a3a">{[[78, 24], [24, 74], [70, 70]].map(([x, y]) => <path key={x} d="M0 -7 L3 0 L0 7 L-3 0 Z" transform={`translate(${x} ${y}) rotate(40)`} />)}</g>
            <text x="50" y="80" textAnchor="middle" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="10" fill="#ff4a4a" stroke="#2a0606" strokeWidth="2.5" paintOrder="stroke">WARNING !</text>
          </>
        );
      case 'lightwing_volley':
        return <LightwingVolleyArt className="" bare />;
      default:
        return null;
    }
  })();
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <defs><Glow id={`${id}g`} blur={6} /><Glow id={`${id}s`} blur={2.2} /></defs>
      {body}
    </svg>
  );
}

// ---- Flyers -----------------------------------------------------------------------------------------------

/** A wooden (or painted) park bench seen from the front-left. */
function Bench({ slat, dark, legs }) {
  return (
    <g strokeLinejoin="round">
      <path d="M22 62 L20 86 M78 58 L80 80 M30 66 L30 90 M70 62 L72 84" stroke={legs} strokeWidth="4" strokeLinecap="round" />
      {[0, 1, 2].map((i) => <path key={`b${i}`} d={`M10 ${30 + i * 9} L86 ${20 + i * 9} L88 ${25 + i * 9} L12 ${35 + i * 9} Z`} fill={slat} stroke={dark} strokeWidth="1" />)}
      {[0, 1, 2].map((i) => <path key={`s${i}`} d={`M14 ${60 + i * 5} L84 ${50 + i * 5} L90 ${54 + i * 5} L18 ${65 + i * 5} Z`} fill={slat} stroke={dark} strokeWidth="1" />)}
      <path d="M14 34 L16 62 M84 24 L84 52" stroke={legs} strokeWidth="3.5" />
    </g>
  );
}

export function FlyerIcon({ id: item, className }) {
  const id = uid();
  if (item === 'sixty_seven') return <SixtySevenIcon className={className} />;
  if (item === 'hovering_ufo') return <UfoIcon className={className} />;
  if (item === 'lightwing_wings') return <LightwingWingsArt className={className} />;
  const body = (() => {
    switch (item) {
      case 'shackles_motorcycle':
        return (
          <g strokeLinejoin="round">
            <circle cx="22" cy="68" r="16" fill="#ff1a1a" opacity="0.5" filter={`url(#${id}g)`} />
            <circle cx="76" cy="68" r="16" fill="#ff1a1a" opacity="0.5" filter={`url(#${id}g)`} />
            {[22, 76].map((x) => (
              <g key={x}>
                <circle cx={x} cy="68" r="13" fill="#141418" stroke="#ff3a3a" strokeWidth="3" />
                <circle cx={x} cy="68" r="5" fill="#3a3a42" stroke="#ff7a7a" strokeWidth="1.5" />
              </g>
            ))}
            <path d="M22 68 L40 50 L64 50 L76 68" fill="none" stroke="#2a2a30" strokeWidth="5" />
            <path d="M32 48 Q40 36 58 38 L70 44 L62 54 L38 56 Z" fill="#1a1a1e" stroke="#4a4a52" strokeWidth="1.5" />
            <path d="M44 40 L60 40 L60 46 L44 46 Z" fill="#c81a1a" />
            <path d="M68 42 L74 32 L80 34" fill="none" stroke="#3a3a42" strokeWidth="3" strokeLinecap="round" />
            <path d="M30 46 L22 40" stroke="#ff4a4a" strokeWidth="2" />
            <path d="M80 12 L94 36 L66 36 Z" fill="#e01a1a" stroke="#ffffff" strokeWidth="2" />
            <path d="M80 20 V28 M80 31 V32" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M8 18 L36 6 L40 14 L12 26 Z" fill="#e85a5a" opacity="0.85" />
            <text x="24" y="19" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="6" fill="#fff" transform="rotate(-22 24 16)" textAnchor="middle">WARNING</text>
          </g>
        );
      case 'hot_dog_jetpack':
        return (
          <g>
            <path d="M28 76 Q24 90 32 98 Q40 90 36 76 Z M62 76 Q58 90 66 98 Q74 90 70 76 Z" fill="#ffae1a" filter={`url(#${id}s)`} />
            <rect x="20" y="16" width="24" height="62" rx="12" fill={`url(#${id}red)`} />
            <rect x="54" y="20" width="24" height="58" rx="10" fill={`url(#${id}duck)`} />
            <rect x="60" y="10" width="12" height="12" rx="3" fill="#e0a800" />
            <path d="M24 30 Q32 40 26 50 Q34 58 28 68" fill="none" stroke="#ffd21a" strokeWidth="3" strokeLinecap="round" />
            <path d="M62 34 Q70 44 64 54 Q72 62 66 70" fill="none" stroke="#e01a1a" strokeWidth="2.6" strokeLinecap="round" />
            <rect x="16" y="58" width="66" height="8" rx="3" fill="#2a5aa8" stroke="#14284a" strokeWidth="1.5" />
            <g fill="none" stroke="#ff8a1a" strokeWidth="1.6" opacity="0.9"><ellipse cx="32" cy="74" rx="14" ry="3" /><ellipse cx="66" cy="74" rx="14" ry="3" /></g>
          </g>
        );
      case 'tech_eye':
        return (
          <g>
            <circle cx="50" cy="50" r="40" fill="#2adcf0" opacity="0.3" filter={`url(#${id}g)`} />
            <circle cx="50" cy="50" r="34" fill={`url(#${id}white)`} stroke="#3a4250" strokeWidth="2" />
            <path d="M16 50 Q50 28 84 50 Q50 72 16 50 Z" fill="#1a2a38" />
            <path d="M18 44 Q50 24 82 44" fill="none" stroke="#26c8d8" strokeWidth="5" />
            <path d="M18 56 Q50 76 82 56" fill="none" stroke="#26c8d8" strokeWidth="5" />
            <circle cx="50" cy="50" r="13" fill="#26e0f0" filter={`url(#${id}s)`} />
            <circle cx="50" cy="50" r="10" fill="#bffaff" />
            <circle cx="50" cy="50" r="4" fill="#0a2a38" />
            <ellipse cx="38" cy="28" rx="10" ry="5" fill="#ffffff" opacity="0.6" transform="rotate(-25 38 28)" />
          </g>
        );
      case 'careful_bomb':
        return (
          <g>
            <circle cx="50" cy="58" r="40" fill="#ff8a00" opacity="0.6" filter={`url(#${id}g)`} />
            <Rays cx={50} cy={58} n={16} inner={30} outer={46} half={0.06} fill="#ffb84a" />
            <path d="M58 26 Q64 8 80 6" fill="none" stroke="#c8a070" strokeWidth="4" strokeLinecap="round" />
            <path d="M80 2 L82 10 L88 6 L83 12 L90 14 L82 14 L80 20 L78 14 Z" fill="#fff6c0" />
            <rect x="48" y="22" width="16" height="12" rx="2" fill="#3a3a42" transform="rotate(20 56 28)" />
            <circle cx="50" cy="58" r="28" fill="#141418" />
            <path d="M38 46 L62 70 M62 46 L38 70" stroke="#ffd21a" strokeWidth="6" strokeLinecap="round" />
            <ellipse cx="40" cy="44" rx="7" ry="4" fill="#ffffff" opacity="0.3" transform="rotate(-30 40 44)" />
          </g>
        );
      case 'rocket':
        return (
          <g strokeLinejoin="round">
            <path d="M50 98 Q38 84 44 72 L56 72 Q62 84 50 98 Z" fill="#ffae1a" filter={`url(#${id}s)`} />
            <path d="M50 92 Q44 84 46 74 L54 74 Q56 84 50 92 Z" fill="#fff2a0" />
            <path d="M36 62 L26 80 L40 74 Z M64 62 L74 80 L60 74 Z" fill="#2a3a6a" />
            <path d="M50 4 Q68 22 64 72 L36 72 Q32 22 50 4 Z" fill={`url(#${id}white)`} stroke="#8a92a0" strokeWidth="1.5" />
            <path d="M50 4 Q60 12 63 26 L37 26 Q40 12 50 4 Z" fill="#1a2a5a" />
            {[38, 54].map((y) => <circle key={y} cx="50" cy={y} r="6.5" fill="#9ac0e8" stroke="#2a3a6a" strokeWidth="2.5" />)}
          </g>
        );
      case 'spacecraft':
        return (
          <g strokeLinejoin="round">
            <path d="M38 86 Q36 96 42 100 Q46 94 44 86 Z M56 86 Q54 96 60 100 Q64 94 62 86 Z" fill="#ffae1a" filter={`url(#${id}s)`} />
            <path d="M28 62 L14 84 L40 80 Z M72 62 L86 84 L60 80 Z" fill="#e8eaee" stroke="#6a7280" strokeWidth="1.2" />
            <path d="M50 6 Q62 18 62 40 L64 86 L36 86 L38 40 Q38 18 50 6 Z" fill={`url(#${id}white)`} stroke="#6a7280" strokeWidth="1.5" />
            <path d="M50 6 Q56 10 58 18 L42 18 Q44 10 50 6 Z" fill="#2a2e38" />
            <g fill="#2a2e38"><rect x="45" y="24" width="3.5" height="4" rx="1" /><rect x="51.5" y="24" width="3.5" height="4" rx="1" /></g>
            <path d="M40 80 H60 V86 H40 Z" fill="#3a3e48" />
            <path d="M44 40 V78 M56 40 V78" stroke="#c8ced8" strokeWidth="1" />
          </g>
        );
      case 'strawberry_donut':
        return (
          <g>
            <circle cx="50" cy="52" r="44" fill="#ff7ad8" opacity="0.35" filter={`url(#${id}g)`} />
            <ellipse cx="50" cy="58" rx="42" ry="28" fill="#d8a060" />
            <path d="M10 54 Q8 28 50 24 Q92 28 90 54 Q88 74 50 76 Q12 74 10 54 Z" fill="#f4a8c8" />
            <ellipse cx="50" cy="50" rx="13" ry="7" fill="#e8c8a0" />
            <ellipse cx="50" cy="51" rx="9" ry="4.5" fill="#6a3a1a" />
            {[[28, 40, '#6ae0ff', 20], [62, 34, '#6ae0ff', -30], [74, 50, '#6ae0ff', 60], [32, 60, '#5ab8e8', -10], [60, 64, '#6ae0ff', 40], [20, 52, '#5ab8e8', 70], [44, 32, '#6ae0ff', 0], [80, 40, '#5ab8e8', -50], [46, 68, '#6ae0ff', 10]].map(([x, y, c, r]) => (
              <rect key={`${x}${y}`} x={x - 4} y={y - 1.4} width="8" height="2.8" rx="1.4" fill={c} transform={`rotate(${r} ${x} ${y})`} />
            ))}
            <g fill="#ffffff">{[[14, 22], [86, 20], [90, 76], [12, 80]].map(([x, y]) => <path key={x} d="M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1 Z" transform={`translate(${x} ${y})`} />)}</g>
          </g>
        );
      case 'piloted_ufo':
        return (
          <g>
            <path d="M14 56 Q2 34 10 22 Q18 40 30 50 Z M86 56 Q98 34 90 22 Q82 40 70 50 Z" fill="#8a6a4a" stroke="#3a2a1a" strokeWidth="1.5" />
            <ellipse cx="50" cy="60" rx="44" ry="20" fill={`url(#${id}red)`} stroke="#5a0a0a" strokeWidth="1.5" />
            <ellipse cx="50" cy="52" rx="28" ry="12" fill="#b81414" />
            <ellipse cx="50" cy="50" rx="22" ry="9" fill="#e8f4ff" stroke="#9ab0c8" strokeWidth="1.5" />
            <ellipse cx="44" cy="48" rx="8" ry="3" fill="#ffffff" opacity="0.8" />
            <g fill="#ffffff">{[20, 36, 64, 80].map((x) => <circle key={x} cx={x} cy={x === 20 || x === 80 ? 64 : 70} r="2.5" />)}</g>
          </g>
        );
      case 'magic_broom':
        return (
          <g>
            <circle cx="74" cy="28" r="22" fill="#ffe680" opacity="0.5" filter={`url(#${id}g)`} />
            <path d="M14 88 L66 34" stroke="#6a4020" strokeWidth="5" strokeLinecap="round" />
            <path d="M16 86 L64 36" stroke="#9a6a3a" strokeWidth="2" strokeLinecap="round" />
            <path d="M60 30 L72 18 Q92 10 96 18 Q94 34 80 40 L68 42 Z" fill="#c89a4a" stroke="#6a4a1a" strokeWidth="1.5" />
            <g stroke="#8a6020" strokeWidth="1">{[0, 1, 2, 3].map((i) => <path key={i} d={`M${68 + i * 4} ${36 - i * 3} L${88 + i * 2} ${18 + i * 4}`} />)}</g>
            <path d="M60 34 L68 42 M64 30 L72 38" stroke="#2a8a3a" strokeWidth="3" />
            <circle cx="24" cy="78" r="6" fill="#ffd21a" filter={`url(#${id}s)`} />
            <g fill="#fff6c0">{[[30, 66], [18, 90], [40, 80], [84, 50]].map(([x, y]) => <path key={x} d="M0 -3.5 L1 -1 L3.5 0 L1 1 L0 3.5 L-1 1 L-3.5 0 L-1 -1 Z" transform={`translate(${x} ${y})`} />)}</g>
          </g>
        );
      case 'park_bench':
        return <Bench slat="#c8964a" dark="#6a4a1a" legs="#1e2026" />;
      case 'cyan_park_bench':
        return <Bench slat="#1aa8a0" dark="#0a5a56" legs="#12302e" />;
      case 'trophy':
        return (
          <g>
            <circle cx="50" cy="44" r="40" fill="#ffe680" opacity="0.5" filter={`url(#${id}g)`} />
            <path d="M24 22 Q8 22 12 38 Q16 50 30 50 M76 22 Q92 22 88 38 Q84 50 70 50" fill="none" stroke="#d8a818" strokeWidth="6" />
            <path d="M24 14 H76 Q76 52 50 60 Q24 52 24 14 Z" fill={`url(#${id}duck)`} stroke="#9a7008" strokeWidth="1.5" />
            <path d="M24 14 H76" stroke="#fff4b0" strokeWidth="3" />
            <path d="M44 60 H56 L58 74 H42 Z" fill="#d8a818" />
            <rect x="32" y="74" width="36" height="12" rx="2" fill="#c8961a" stroke="#7a5808" strokeWidth="1.5" />
            <path d="M28 18 L22 34 L30 30 Z" fill="#e01a1a" />
            <ellipse cx="36" cy="26" rx="5" ry="10" fill="#ffffff" opacity="0.35" />
          </g>
        );
      case 'vacation_chair':
        return (
          <g strokeLinejoin="round">
            <path d="M18 72 L36 30 L46 32 L30 76 Z" fill="#8a4a20" />
            <path d="M30 76 L86 66 L84 74 L30 84 Z" fill="#6a3a18" />
            <path d="M22 68 L40 32 L78 36 L68 64 Z" fill="#f2f2ee" stroke="#cfcfc8" strokeWidth="1" />
            <path d="M34 62 L80 56 L86 64 L30 74 Z" fill="#e6e6e0" />
            <rect x="46" y="48" width="22" height="9" rx="4" fill="#c83a2a" transform="rotate(-8 57 52)" />
            <path d="M28 82 L32 94 M80 72 L84 88 M60 76 L62 92" stroke="#5a3010" strokeWidth="4" strokeLinecap="round" />
            <path d="M60 44 L88 42 L90 48 L62 50 Z" fill="#a8602a" />
          </g>
        );
      case 'colorful_balloon':
        return (
          <g>
            <path d="M50 96 L34 54 M50 96 L50 46 M50 96 L66 54 M50 96 L28 32 M50 96 L72 32" stroke="#3a3a3a" strokeWidth="1" />
            <path d="M46 92 L50 98 L54 92 Z" fill="#e01a1a" />
            {[[28, 30, '#a05aff'], [72, 30, '#7ad62a'], [50, 22, '#6ac8ff'], [34, 52, '#ffd21a'], [66, 52, '#ffd21a'], [50, 44, '#ff6a8a']].map(([x, y, c]) => (
              <g key={`${x}${y}`}>
                <ellipse cx={x} cy={y} rx="14" ry="16" fill={c} />
                <ellipse cx={x} cy={y} rx="14" ry="16" fill={`url(#${id}shine)`} />
              </g>
            ))}
            <g fill="#ffffff" opacity="0.8">{[[46, 18], [54, 24], [48, 28]].map(([x, y]) => <circle key={x + y} cx={x} cy={y} r="2" />)}</g>
          </g>
        );
      case 'rainbow_popsicle':
        return (
          <g transform="rotate(-30 50 50)">
            <rect x="44" y="70" width="12" height="28" rx="5" fill="#e8c890" stroke="#8a6a3a" strokeWidth="1.2" />
            <clipPath id={`${id}pop`}><rect x="28" y="6" width="44" height="70" rx="20" /></clipPath>
            <g clipPath={`url(#${id}pop)`}>
              {['#ffe066', '#ffc8a0', '#ff9ab8', '#ff7aa8', '#8ad8ff', '#5ab8ff'].map((c, i) => <rect key={c} x="28" y={6 + i * 12} width="44" height="12" fill={c} />)}
            </g>
            <rect x="28" y="6" width="44" height="70" rx="20" fill={`url(#${id}shine)`} />
          </g>
        );
      case 'wooden_barrel':
        return (
          <g>
            <path d="M24 16 Q16 50 24 86 L76 86 Q84 50 76 16 Z" fill={`url(#${id}wood)`} stroke="#4a2a10" strokeWidth="1.5" />
            <ellipse cx="50" cy="16" rx="26" ry="8" fill="#c08a50" stroke="#4a2a10" strokeWidth="1.5" />
            <ellipse cx="50" cy="16" rx="20" ry="5" fill="#a87040" />
            <g stroke="#3a4250" strokeWidth="4" fill="none">
              <path d="M21 32 Q50 40 79 32" /><path d="M20 70 Q50 78 80 70" />
            </g>
            <g stroke="#6a3a18" strokeWidth="1" opacity="0.7">{[34, 44, 56, 66].map((x) => <path key={x} d={`M${x} 22 Q${x + (x - 50) * 0.15} 50 ${x} 90`} />)}</g>
          </g>
        );
      case 'red_buddy':
        return (
          <g>
            <circle cx="50" cy="50" r="40" fill={`url(#${id}red)`} />
            <circle cx="32" cy="56" r="14" fill="#9aa6b8" stroke="#2a2e38" strokeWidth="3.5" />
            <circle cx="70" cy="52" r="11" fill="#9aa6b8" stroke="#2a2e38" strokeWidth="3.5" />
            <ellipse cx="28" cy="52" rx="5" ry="3.5" fill="#e8eef8" /><ellipse cx="67" cy="48" rx="3.5" ry="2.5" fill="#e8eef8" />
            <ellipse cx="38" cy="24" rx="12" ry="6" fill="#fff" opacity="0.4" transform="rotate(-25 38 24)" />
          </g>
        );
      case 'leaf_surfboard':
        return (
          <g transform="rotate(-35 50 50)">
            <path d="M50 2 Q82 30 74 64 Q66 90 50 98 Q34 90 26 64 Q18 30 50 2 Z" fill="#2a8a4a" stroke="#14502a" strokeWidth="1.5" />
            <path d="M50 2 Q70 34 64 70 Q58 90 50 98 Z" fill="#3aa85a" />
            <path d="M50 8 V94" stroke="#1a6a3a" strokeWidth="2" />
            <g stroke="#1a6a3a" strokeWidth="1.2">{[22, 36, 50, 64, 78].map((y) => <path key={y} d={`M50 ${y} L${30 + y * 0.05} ${y - 8} M50 ${y} L${70 - y * 0.05} ${y - 8}`} />)}</g>
          </g>
        );
      case 'coffee_cup':
        return (
          <g>
            <path d="M70 34 Q92 34 88 54 Q84 70 66 66" fill="none" stroke="#e8eaee" strokeWidth="7" />
            <path d="M16 22 L76 22 L70 86 Q46 94 22 86 Z" fill={`url(#${id}white)`} stroke="#8a92a0" strokeWidth="1.5" />
            <ellipse cx="46" cy="22" rx="30" ry="9" fill="#e8eaee" stroke="#8a92a0" strokeWidth="1.5" />
            <ellipse cx="46" cy="23" rx="25" ry="6.5" fill="#3a2414" />
            <path d="M26 60 L30 84 M38 66 L40 88" stroke="#5a7ad8" strokeWidth="2" opacity="0.7" />
          </g>
        );
      case 'bed':
        return (
          <g strokeLinejoin="round">
            <path d="M14 46 L58 22 L90 40 L46 66 Z" fill="#f2f2f2" />
            <path d="M22 50 L62 28 L90 44 L50 68 Z" fill={`url(#${id}red)`} />
            <path d="M14 46 L46 66 L46 84 L14 64 Z" fill="#c22020" />
            <path d="M46 66 L90 40 L90 58 L46 84 Z" fill="#8a1414" />
            <path d="M14 40 L26 34 L40 42 L28 48 Z" fill="#ffffff" stroke="#d6d6d6" strokeWidth="1" />
            <path d="M8 26 L18 22 L18 70 L8 74 Z" fill="#7a4a20" />
            <path d="M18 22 L26 18 L26 40 L18 46 Z" fill="#a8723e" />
          </g>
        );
      case 'wooden_chair':
        return (
          <g strokeLinejoin="round">
            <path d="M30 8 L58 4 L60 52 L32 56 Z" fill="#7a4a24" stroke="#3a2010" strokeWidth="1.5" />
            <path d="M36 14 L54 12 L55 46 L37 48 Z" fill="#a8342a" />
            <path d="M32 56 L60 52 L80 62 L50 68 Z" fill="#8a5a2c" stroke="#3a2010" strokeWidth="1.5" />
            <path d="M32 56 L50 68 L50 72 L32 60 Z" fill="#5a3418" />
            <path d="M34 60 L34 92 M50 70 L50 98 M78 64 L78 90 M60 56 L60 84" stroke="#4a2a12" strokeWidth="4" strokeLinecap="round" />
          </g>
        );
      case 'paper_airplane':
        return (
          <g strokeLinejoin="round">
            <path d="M6 44 L94 18 L40 56 Z" fill="#ffffff" stroke="#c9ced8" strokeWidth="1" />
            <path d="M40 56 L94 18 L56 74 Z" fill="#e4e8ef" stroke="#c9ced8" strokeWidth="1" />
            <path d="M40 56 L46 70 L56 74 Z" fill="#b9c0cc" />
          </g>
        );
      case 'rubber_duck':
        return (
          <g>
            <ellipse cx="52" cy="66" rx="34" ry="22" fill={`url(#${id}duck)`} />
            <circle cx="40" cy="36" r="18" fill={`url(#${id}duck)`} />
            <path d="M22 38 Q10 40 14 46 Q22 46 26 44 Z" fill="#ff8a1a" />
            <circle cx="36" cy="32" r="3.5" fill="#1a1a1a" /><circle cx="35" cy="31" r="1.2" fill="#fff" />
            <path d="M58 58 Q72 50 80 62 Q70 70 58 66 Z" fill="#ffd21a" stroke="#e0a800" strokeWidth="1.5" />
          </g>
        );
      default:
        return null;
    }
  })();
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <Glow id={`${id}g`} blur={6} />
        <Glow id={`${id}s`} blur={2.2} />
        <radialGradient id={`${id}red`} cx="38%" cy="32%" r="70%"><stop offset="0" stopColor="#ff6a6a" /><stop offset="0.6" stopColor="#e01a1a" /><stop offset="1" stopColor="#7a0606" /></radialGradient>
        <radialGradient id={`${id}duck`} cx="38%" cy="32%" r="70%"><stop offset="0" stopColor="#fff59a" /><stop offset="0.6" stopColor="#ffd21a" /><stop offset="1" stopColor="#c88a00" /></radialGradient>
        <linearGradient id={`${id}white`} x1="0" x2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#b9c2d0" /></linearGradient>
        <linearGradient id={`${id}wood`} x1="0" x2="1"><stop offset="0" stopColor="#8a5a2a" /><stop offset="0.45" stopColor="#c08a50" /><stop offset="1" stopColor="#7a4a20" /></linearGradient>
        <radialGradient id={`${id}shine`} cx="35%" cy="28%" r="70%"><stop offset="0" stopColor="#ffffff" stopOpacity="0.55" /><stop offset="0.5" stopColor="#ffffff" stopOpacity="0" /><stop offset="1" stopColor="#000000" stopOpacity="0.25" /></radialGradient>
      </defs>
      {body}
    </svg>
  );
}

/** Any owned thing's picture: kind 'ball', 'explosion' or 'flyer'. */
export function ItemIcon({ kind, id, className }) {
  if (kind === 'explosion') return <ExplosionIcon id={id} className={className} />;
  if (kind === 'flyer') return <FlyerIcon id={id} className={className} />;
  if (id === 'lightwing') return <LightwingBallArt className={className} />;
  return <BallIcon kind={id} className={className} />;
}

// ---- Crates ------------------------------------------------------------------------------------------------

/** The gacha machine: a glass case full of balls on a dark base, a coin (or, red-lidded, a diamond) on top. */
export function GachaMachineArt({ className, diamond = false }) {
  const id = uid();
  const balls = [
    [42, 84, '#2a8cff'], [58, 86, '#e02a2a'], [74, 84, '#7ad62a'], [90, 86, '#ffd21a'], [106, 84, '#a05aff'],
    [48, 70, '#ff8a1a'], [64, 72, '#26d0c8'], [82, 70, '#e02a8a'], [98, 72, '#2a8cff'], [56, 56, '#ffd21a'], [74, 58, '#3a3a40'], [92, 58, '#e8e8e8'],
  ];
  return (
    <svg className={className} viewBox="0 0 150 150" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}glass`} x1="0" x2="1"><stop offset="0" stopColor="#d8f0ff" stopOpacity="0.55" /><stop offset="0.5" stopColor="#a8d8ff" stopOpacity="0.18" /><stop offset="1" stopColor="#e0f4ff" stopOpacity="0.45" /></linearGradient>
        <linearGradient id={`${id}base`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a3550" /><stop offset="1" stopColor="#141a2a" /></linearGradient>
        <radialGradient id={`${id}ball`} cx="35%" cy="30%" r="70%"><stop offset="0" stopColor="#fff" stopOpacity="0.6" /><stop offset="1" stopColor="#000" stopOpacity="0.25" /></radialGradient>
        <Glow id={`${id}g`} blur={3} />
      </defs>
      <ellipse cx="75" cy="140" rx="48" ry="6" fill="#000" opacity="0.35" />
      {/* base */}
      <path d="M34 100 H116 L112 136 H38 Z" fill={`url(#${id}base)`} stroke="#0a0e18" strokeWidth="2" />
      <path d="M38 134 H112" stroke="#4ad8ff" strokeWidth="3" filter={`url(#${id}g)`} />
      <rect x="62" y="110" width="26" height="18" rx="3" fill="#0a0e18" stroke="#4a5878" strokeWidth="1.5" />
      {/* balls inside the glass */}
      {balls.map(([x, y, c]) => (
        <g key={`${x}${y}`}><circle cx={x} cy={y} r="8.5" fill={c} /><circle cx={x} cy={y} r="8.5" fill={`url(#${id}ball)`} /></g>
      ))}
      <rect x="32" y="40" width="86" height="60" rx="4" fill={`url(#${id}glass)`} stroke="#cfe8ff" strokeWidth="2" />
      <path d="M38 46 L46 46 L40 94 L36 94 Z" fill="#ffffff" opacity="0.45" />
      {/* lid */}
      <path d="M28 30 H122 L118 42 H32 Z" fill={diamond ? '#d42a2a' : '#2a3550'} stroke="#0a0e18" strokeWidth="2" />
      <path d="M30 31 H120" stroke={diamond ? '#ff7a7a' : '#4a5a80'} strokeWidth="2" />
      {diamond ? (
        <g transform="translate(75 18)">
          <path d="M-11 -6 H11 L16 1 L0 16 L-16 1 Z" fill="#4ab8ff" stroke="#0d3f86" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M-16 1 H16 M-5 -6 L-7 1 L0 16 L7 1 L5 -6" fill="none" stroke="#d8f4ff" strokeWidth="1" />
        </g>
      ) : (
        <g transform="translate(75 22)">
          <ellipse cx="0" cy="2" rx="12" ry="11" fill="#c87a00" />
          <ellipse cx="0" cy="0" rx="12" ry="11" fill="#ffc21f" stroke="#a86000" strokeWidth="1.5" />
          <ellipse cx="0" cy="0" rx="7.5" ry="7" fill="none" stroke="#ffe27a" strokeWidth="1.5" />
        </g>
      )}
    </svg>
  );
}

/** The explosion crate: a chunky retro TV with antenna and a lens, its screen glowing. */
export function TvCrateArt({ className, diamond = false }) {
  const id = uid();
  return (
    <svg className={className} viewBox="0 0 150 150" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}body`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#c8d8ec" /><stop offset="1" stopColor="#6a84a8" /></linearGradient>
        <radialGradient id={`${id}screen`} cx="45%" cy="40%" r="70%">
          <stop offset="0" stopColor="#ffffff" /><stop offset="0.7" stopColor={diamond ? '#e8b8ff' : '#e8f4ff'} /><stop offset="1" stopColor={diamond ? '#a040e0' : '#9ac0e8'} />
        </radialGradient>
        <Glow id={`${id}g`} blur={4} />
      </defs>
      <ellipse cx="72" cy="140" rx="46" ry="6" fill="#000" opacity="0.35" />
      <path d="M58 12 L66 34 M90 6 L80 34" stroke="#2a2e38" strokeWidth="4" strokeLinecap="round" />
      <circle cx="58" cy="12" r="4" fill="#2a2e38" /><circle cx="90" cy="6" r="4" fill="#2a2e38" />
      <path d="M22 40 Q22 32 30 32 H112 Q120 32 120 40 V124 Q120 132 112 132 H30 Q22 132 22 124 Z" fill={`url(#${id}body)`} stroke="#2a3448" strokeWidth="3" />
      <rect x="40" y="40" width="70" height="18" rx="2" fill="#2a3448" />
      <path d="M44 46 H106 M44 52 H106" stroke="#7a8aa8" strokeWidth="2" />
      <rect x="34" y="66" width="70" height="56" rx="8" fill={diamond ? '#c060ff' : '#c8e4ff'} filter={`url(#${id}g)`} opacity="0.8" />
      <rect x="34" y="66" width="70" height="56" rx="8" fill={`url(#${id}screen)`} stroke="#2a3448" strokeWidth="2.5" />
      <rect x="108" y="58" width="22" height="22" rx="3" fill="#5a6a88" stroke="#2a3448" strokeWidth="2" />
      <circle cx="130" cy="69" r="9" fill="#d8e4f4" stroke="#2a3448" strokeWidth="2.5" />
      <circle cx="130" cy="69" r="4" fill="#3a4868" />
      <circle cx="112" cy="122" r="3" fill="#ff3a3a" />
    </svg>
  );
}

/** The flyer crate: an open cardboard box spilling toys (balls, a rocket, a saucer and a "67"). */
export function ToyBoxArt({ className }) {
  const id = uid();
  return (
    <svg className={className} viewBox="0 0 150 150" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}front`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e0b070" /><stop offset="1" stopColor="#b07a3a" /></linearGradient>
        <radialGradient id={`${id}ball`} cx="35%" cy="30%" r="70%"><stop offset="0" stopColor="#fff" stopOpacity="0.6" /><stop offset="1" stopColor="#000" stopOpacity="0.2" /></radialGradient>
      </defs>
      <ellipse cx="75" cy="142" rx="56" ry="6" fill="#000" opacity="0.35" />
      <path d="M26 70 L76 58 L128 70 L78 84 Z" fill="#6a4418" />
      {/* toys */}
      <path d="M88 12 Q98 24 96 58 L82 58 Q80 24 88 12 Z" fill="#f2f4f8" stroke="#8a92a0" strokeWidth="1.5" />
      <circle cx="89" cy="34" r="5" fill="#5ac8ff" stroke="#5a6478" strokeWidth="1.5" />
      <path d="M88 12 Q93 17 95 24 L82 24 Q84 17 88 12 Z" fill="#e02a2a" />
      <g transform="translate(110 40)"><ellipse rx="18" ry="6" fill="#d8dee8" /><path d="M-9 -2 A9 9 0 0 1 9 -2 Z" fill="#5ad8ff" /></g>
      {[[44, 56, '#2a8cff'], [58, 48, '#ffd21a'], [36, 42, '#a05aff'], [52, 32, '#e02a2a'], [70, 60, '#7ad62a']].map(([x, y, c]) => (
        <g key={c}><circle cx={x} cy={y} r="9" fill={c} /><circle cx={x} cy={y} r="9" fill={`url(#${id}ball)`} /></g>
      ))}
      <text x="78" y="88" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="26" fill="#ffae1a" stroke="#7a3a00" strokeWidth="2" paintOrder="stroke">67</text>
      {/* box */}
      <path d="M26 70 L78 84 L78 134 L28 118 Z" fill={`url(#${id}front)`} stroke="#6a4418" strokeWidth="1.5" />
      <path d="M78 84 L128 70 L126 118 L78 134 Z" fill="#c08848" stroke="#6a4418" strokeWidth="1.5" />
      <path d="M26 70 L8 84 L58 98 L78 84 Z" fill="#d8a868" stroke="#6a4418" strokeWidth="1.5" />
      <path d="M128 70 L146 82 L98 98 L78 84 Z" fill="#c89858" stroke="#6a4418" strokeWidth="1.5" />
      <rect x="44" y="98" width="20" height="8" fill="#e8e8e8" opacity="0.8" transform="rotate(16 54 102)" />
    </svg>
  );
}

// ---- Diamonds -------------------------------------------------------------------------------------------

/** One cut diamond, `size` across, tilted by `angle`. */
function Gem({ x, y, size, angle = 0, id }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${size / 40})`}>
      <path d="M-14 -12 H14 L20 -2 L0 18 L-20 -2 Z" fill={`url(#${id})`} stroke="#1c5aa8" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M-20 -2 H20 M-6 -12 L-8 -2 L0 18 L8 -2 L6 -12" fill="none" stroke="#e8f8ff" strokeWidth="1" opacity="0.8" />
      <path d="M-14 -12 L-8 -2 L-20 -2 Z" fill="#ffffff" opacity="0.35" />
    </g>
  );
}

/** A diamond pack's picture: a few stones, a heap, or (for the big packs) open chests brimming with them. */
export function GemPackArt({ className, tier = 0 }) {
  const id = uid();
  const stones = [
    [[34, 64, 48, -12], [70, 68, 50, 14], [52, 42, 44, 4]],
    [[22, 70, 42, -14], [50, 74, 46, 8], [78, 68, 44, 18], [36, 48, 42, -4], [64, 46, 42, 10], [50, 26, 36, -8]],
    [[14, 74, 38, -14], [38, 78, 40, 8], [62, 78, 40, 16], [86, 72, 38, -6], [26, 54, 38, 4], [50, 56, 40, -10], [74, 52, 38, 12], [38, 34, 36, 6], [62, 32, 36, -6]],
  ];
  const chest = (x, y, scale) => (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M-36 -10 L-30 -50 Q0 -60 30 -50 L36 -10 Z" fill="#2e3240" stroke="#14161c" strokeWidth="2" />
      <path d="M-30 -48 Q0 -58 30 -48" fill="none" stroke="#6a707e" strokeWidth="3" />
      <path d="M-38 -10 H38 L34 26 H-34 Z" fill="#4a4e58" stroke="#14161c" strokeWidth="2" />
      <path d="M-38 -10 H38" stroke="#7a808c" strokeWidth="3" />
      {[[-20, -12, 26, -10], [0, -16, 28, 8], [20, -12, 26, 16], [-10, -22, 24, 4], [12, -24, 24, -12]].map(([gx, gy, s, a]) => (
        <Gem key={`${gx}${gy}`} x={gx} y={gy} size={s} angle={a} id={`${id}gem`} />
      ))}
      <rect x="-6" y="0" width="12" height="12" rx="2" fill="#5ad8ff" stroke="#14161c" strokeWidth="1.5" />
    </g>
  );
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}gem`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#c8f0ff" /><stop offset="0.5" stopColor="#5ab8ff" /><stop offset="1" stopColor="#2a78e0" /></linearGradient>
      </defs>
      {tier < 3 && stones[tier].map(([x, y, s, a]) => <Gem key={`${x}${y}`} x={x} y={y} size={s} angle={a} id={`${id}gem`} />)}
      {tier === 3 && chest(50, 64, 1)}
      {tier === 4 && <>{chest(34, 70, 0.8)}{chest(68, 56, 0.85)}</>}
      {tier === 5 && <>{chest(28, 62, 0.75)}{chest(72, 62, 0.75)}{chest(50, 80, 0.8)}</>}
      {tier >= 3 && <><Gem x={10} y={86} size={20} angle={-20} id={`${id}gem`} /><Gem x={90} y={88} size={18} angle={20} id={`${id}gem`} /></>}
    </svg>
  );
}

// ---- Small icons -----------------------------------------------------------------------------------------

export function GiftIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true">
      <g fill="#fff">
        <rect x="5" y="15" width="30" height="8" rx="1.5" />
        <rect x="7" y="23" width="26" height="14" rx="1.5" />
        <path d="M20 15 C14 4 6 8 10 13 C11 15 16 15 20 15 Z M20 15 C26 4 34 8 30 13 C29 15 24 15 20 15 Z" />
      </g>
      <path d="M18 15 V37 M22 15 V37" stroke="#2a3550" strokeWidth="1.5" />
    </svg>
  );
}

/** The green handshake beside "Tradable". */
export function TradeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 48 36" aria-hidden="true">
      <g fill="#3ddc4a" stroke="#0b2a10" strokeWidth="2.2" strokeLinejoin="round">
        <path d="M2 12 L12 4 L20 8 L28 6 L36 12 L32 18 L24 13 L18 18 C16 20 13 19 13 17 L18 12 L14 11 L5 19 Z" />
        <path d="M46 12 L38 4 L32 6 L36 9 L42 10 L43 19 L37 25 C35 27 33 27 32 25 C30 27 28 27 27 25 C25 27 23 26 22 24 C20 25 18 24 18 22 L14 19 L17 15" />
      </g>
    </svg>
  );
}

export function SearchIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M15.5 15.5 L22 22" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function CycleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 12 A8 8 0 1 1 16.5 5.4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M17 1.5 L17.5 6.5 L12.5 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The grey block standing in for an item's picture in the portal's gifting window. */
export function PlaceholderCube({ className }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 6 L56 18 L32 30 L8 18 Z" fill="#b8b8b8" />
      <path d="M8 18 L32 30 V58 L8 46 Z" fill="#8c8c8c" />
      <path d="M56 18 L32 30 V58 L56 46 Z" fill="#a2a2a2" />
    </svg>
  );
}

// ---- Lightwing -------------------------------------------------------------------------------------------

/** The Lightwing Ball: a violet ring core in a white hex frame with blade-like side fins, glowing. */
export function LightwingBallArt({ className }) {
  const id = uid();
  return (
    <svg className={className} viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <Glow id={`${id}g`} blur={7} />
        <Glow id={`${id}s`} blur={2.5} />
        <radialGradient id={`${id}core`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#3a3450" /><stop offset="0.7" stopColor="#1a1626" /><stop offset="1" stopColor="#0c0a14" />
        </radialGradient>
        <linearGradient id={`${id}frame`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="0.6" stopColor="#d6d2e6" /><stop offset="1" stopColor="#8a84a6" /></linearGradient>
        <linearGradient id={`${id}fin`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="0.5" stopColor="#f0d8ff" /><stop offset="1" stopColor="#b070ff" /></linearGradient>
      </defs>
      <circle cx="100" cy="104" r="70" fill="#9a4aff" opacity="0.35" filter={`url(#${id}g)`} />
      {/* side fins (glowing violet edges) */}
      {[-1, 1].map((side) => (
        <g key={side} transform={`translate(100 0) scale(${side} 1) translate(-100 0)`}>
          <path d="M40 60 Q14 100 34 156 Q40 120 54 92 Z" fill="#c070ff" filter={`url(#${id}s)`} opacity="0.9" />
          <path d="M40 60 Q18 100 34 156 Q42 120 54 92 Z" fill={`url(#${id}fin)`} />
        </g>
      ))}
      {/* the horned hex frame */}
      <path d="M64 30 L80 52 H120 L136 30 L150 92 L138 140 L100 166 L62 140 L50 92 Z" fill={`url(#${id}frame)`} stroke="#3a3550" strokeWidth="3" strokeLinejoin="round" />
      <path d="M74 64 H126 L140 96 L130 132 L100 150 L70 132 L60 96 Z" fill="#26223a" stroke="#6a6488" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="100" cy="100" r="32" fill={`url(#${id}core)`} />
      <circle cx="100" cy="100" r="30" fill="none" stroke="#a050ff" strokeWidth="12" opacity="0.7" filter={`url(#${id}s)`} />
      <circle cx="100" cy="100" r="30" fill="none" stroke="#f4e4ff" strokeWidth="5" />
      <circle cx="100" cy="100" r="17" fill="none" stroke="#c89aff" strokeWidth="3" />
      <ellipse cx="88" cy="88" rx="8" ry="4" fill="#fff" opacity="0.25" transform="rotate(-30 88 88)" />
    </svg>
  );
}

/** Lightwing Volley (the explosion): a violet tornado of rings shot through with blades and lightning. */
export function LightwingVolleyArt({ className, bare = false }) {
  const id = uid();
  const art = (
    <g>
      <defs><Glow id={`${id}g`} blur={5} /><Glow id={`${id}s`} blur={1.6} /></defs>
      <ellipse cx="50" cy="56" rx="30" ry="40" fill="#8a3aff" opacity="0.4" filter={`url(#${id}g)`} />
      <g fill="none" stroke="#e8d0ff" strokeLinecap="round" filter={`url(#${id}s)`}>
        {[[50, 30, 12, 4], [50, 44, 20, 6], [50, 58, 28, 8], [50, 72, 20, 6]].map(([x, y, rx, ry]) => (
          <ellipse key={y} cx={x} cy={y} rx={rx} ry={ry} strokeWidth="2.5" transform={`rotate(-8 ${x} ${y})`} />
        ))}
      </g>
      <path d="M50 4 V96" stroke="#f4eaff" strokeWidth="1.5" opacity="0.8" />
      <path d="M22 20 L34 36 L28 38 L40 56" fill="none" stroke="#d8b8ff" strokeWidth="2" />
      <path d="M80 30 L68 46 L74 48 L60 70" fill="none" stroke="#d8b8ff" strokeWidth="2" />
      <g fill="#cdb8ff" stroke="#6a3ab0" strokeWidth="0.8">
        <path d="M12 60 L30 54 L22 64 Z" /><path d="M88 52 L70 50 L80 60 Z" /><path d="M20 84 L36 72 L32 84 Z" /><path d="M84 82 L66 74 L72 86 Z" />
      </g>
    </g>
  );
  if (bare) return art;
  return <svg className={className} viewBox="0 0 100 100" aria-hidden="true">{art}</svg>;
}

/** Lightwing (the flyer): two crystal wings sweeping up and to the right, long feathers like shards of violet glass. */
export function LightwingWingsArt({ className }) {
  const id = uid();
  // Each feather: [angle from the root in degrees, length, width].
  const feathers = [[-78, 46, 7], [-64, 58, 8], [-50, 66, 8], [-36, 70, 8], [-22, 64, 7], [-8, 54, 6], [6, 40, 5]];
  const wing = (dx, dy, scale, shade) => (
    <g transform={`translate(${dx} ${dy}) scale(${scale})`} opacity={shade}>
      {feathers.map(([angle, length, width]) => (
        <g key={angle} transform={`rotate(${angle})`}>
          <path d={`M0 0 L${length * 0.25} ${-width} L${length} 0 L${length * 0.25} ${width * 0.6} Z`} fill={`url(#${id}f)`} stroke="#2a1f5a" strokeWidth="0.7" strokeLinejoin="round" />
          <path d={`M${length * 0.2} 0 L${length * 0.95} 0`} stroke="#ffffff" strokeWidth="0.8" opacity="0.8" />
        </g>
      ))}
      <ellipse cx="0" cy="0" rx="6" ry="4" fill="#d8ccff" stroke="#2a1f5a" strokeWidth="0.8" />
    </g>
  );
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <Glow id={`${id}g`} blur={5} />
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#5a4aa8" /><stop offset="0.55" stopColor="#c8bcff" /><stop offset="1" stopColor="#ffffff" /></linearGradient>
      </defs>
      <ellipse cx="50" cy="52" rx="42" ry="30" fill="#8a5aff" opacity="0.35" filter={`url(#${id}g)`} />
      {wing(22, 86, 0.95, 0.75)}
      {wing(16, 80, 1.05, 1)}
      <g fill="#f2ecff">{[[60, 70], [72, 80], [80, 64], [66, 88], [88, 76], [54, 82]].map(([x, y]) => <circle key={x + y} cx={x} cy={y} r="1.3" />)}</g>
    </svg>
  );
}

/** The bundle's big preview: the Lightwing Ball on a pedestal in a storm of violet light. */
export function LightwingSceneArt({ className }) {
  const id = uid();
  return (
    <svg className={className} viewBox="0 0 950 710" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}bg`} cx="55%" cy="45%" r="75%">
          <stop offset="0" stopColor="#3a2a8a" /><stop offset="0.5" stopColor="#1e1a5a" /><stop offset="1" stopColor="#0c0c2a" />
        </radialGradient>
        <radialGradient id={`${id}core`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" /><stop offset="0.3" stopColor="#e2d0ff" stopOpacity="0.8" /><stop offset="0.6" stopColor="#9a6aff" stopOpacity="0.45" /><stop offset="1" stopColor="#5a2ad0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}ped`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4a4a66" /><stop offset="1" stopColor="#14141f" /></linearGradient>
        <Glow id={`${id}g`} blur={14} />
        <Glow id={`${id}s`} blur={3} />
      </defs>
      <rect width="950" height="710" fill={`url(#${id}bg)`} />
      {/* sweeping light trails */}
      <g fill="none" stroke="#b890ff" strokeLinecap="round" opacity="0.7" filter={`url(#${id}s)`}>
        <path d="M-40 300 Q300 80 980 120" strokeWidth="6" />
        <path d="M-40 620 Q420 420 980 560" strokeWidth="5" />
        <path d="M120 720 Q300 520 980 680" strokeWidth="3" />
        <path d="M600 -20 Q760 200 980 260" strokeWidth="4" />
      </g>
      {/* pedestal */}
      <ellipse cx="560" cy="600" rx="330" ry="90" fill="#000" opacity="0.4" />
      <path d="M260 560 Q560 470 860 560 L860 610 Q560 700 260 610 Z" fill={`url(#${id}ped)`} />
      <ellipse cx="560" cy="560" rx="300" ry="80" fill="#2e2e44" stroke="#6a6a90" strokeWidth="2" />
      {/* the whirl of white rings */}
      <circle cx="600" cy="330" r="230" fill={`url(#${id}core)`} />
      <circle cx="600" cy="330" r="200" fill="#b080ff" opacity="0.5" filter={`url(#${id}g)`} />
      <g fill="none" stroke="#ffffff" strokeLinecap="round">
        {Array.from({ length: 72 }, (_, i) => {
          const a = (i / 72) * Math.PI * 2;
          return <path key={i} d={`M${pt(600, 330, a, 150 + (i % 3) * 8)} L${pt(600, 330, a + 0.2, 240 - (i % 4) * 10)}`} strokeWidth="7" opacity="0.9" />;
        })}
      </g>
      <g fill="none" stroke="#e6d6ff" strokeLinecap="round" opacity="0.8">
        {Array.from({ length: 40 }, (_, i) => {
          const a = (i / 40) * Math.PI * 2 + 0.05;
          return <path key={i} d={`M${pt(600, 330, a, 95)} L${pt(600, 330, a + 0.25, 140)}`} strokeWidth="5" />;
        })}
      </g>
      <circle cx="600" cy="330" r="150" fill="none" stroke="#ffffff" strokeWidth="4" filter={`url(#${id}s)`} />
      {/* shards */}
      <g fill="#e0d0ff" opacity="0.9">
        {[[300, 230, 20], [250, 300, -30], [340, 400, 60], [410, 180, -10], [780, 160, 40], [880, 470, -50], [240, 470, 10]].map(([x, y, a]) => (
          <path key={x} d="M0 -14 L6 0 L0 14 L-6 0 Z" transform={`translate(${x} ${y}) rotate(${a})`} />
        ))}
      </g>
      <g fill="#ffffff">{[[180, 140], [120, 380], [880, 300], [700, 640], [260, 640], [520, 120]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="4" />)}</g>
      {/* the ball, floating at the left of the whirl */}
      <circle cx="430" cy="420" r="80" fill="#a050ff" opacity="0.5" filter={`url(#${id}g)`} />
      <g transform="translate(350 340) scale(0.8)"><LightwingBallInner /></g>
    </svg>
  );
}

/** LightwingBallArt's shapes without their own <svg>, for drawing inside another picture. */
function LightwingBallInner() {
  return (
    <g>
      <path d="M64 30 L80 52 H120 L136 30 L150 92 L138 140 L100 166 L62 140 L50 92 Z" fill="#dcd8ec" stroke="#3a3550" strokeWidth="3" strokeLinejoin="round" />
      <path d="M74 64 H126 L140 96 L130 132 L100 150 L70 132 L60 96 Z" fill="#26223a" stroke="#6a6488" strokeWidth="2" />
      <circle cx="100" cy="100" r="30" fill="#1a1626" stroke="#f4e4ff" strokeWidth="6" />
      <circle cx="100" cy="100" r="17" fill="none" stroke="#c89aff" strokeWidth="3" />
      <path d="M40 60 Q18 100 34 156 Q42 120 54 92 Z M160 60 Q182 100 166 156 Q158 120 146 92 Z" fill="#efe0ff" />
    </g>
  );
}
