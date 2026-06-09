import {
  interpolateBrBG,
  interpolatePiYG,
  interpolatePRGn,
  interpolatePuOr,
  interpolateRdBu,
  interpolateRdGy,
  interpolateRdYlBu,
  interpolateRdYlGn,
  interpolateSpectral,
  interpolateTurbo,
  interpolateCividis,
  interpolateViridis,
  interpolateMagma,
  interpolateInferno,
  interpolatePlasma,
  interpolateWarm,
  interpolateCool,
  interpolateCubehelixDefault,
  interpolateBuGn,
  interpolateBuPu,
  interpolateGnBu,
  interpolateOrRd,
  interpolatePuBuGn,
  interpolatePuBu,
  interpolatePuRd,
  interpolateRdPu,
  interpolateYlGnBu,
  interpolateYlGn,
  interpolateYlOrBr,
  interpolateYlOrRd,
  interpolateBlues,
  interpolateGreens,
  interpolateGreys,
  interpolateOranges,
  interpolatePurples,
  interpolateReds,
} from 'd3-scale-chromatic';

type Interpolator = (t: number) => string;

// ── Custom domain-specific interpolators ──────────────────────────────────────

function lerpRgb(c0: [number, number, number], c1: [number, number, number], f: number): string {
  return `rgb(${Math.round(c0[0] + f * (c1[0] - c0[0]))},${Math.round(c0[1] + f * (c1[1] - c0[1]))},${Math.round(c0[2] + f * (c1[2] - c0[2]))})`;
}

// const FLOOD_DEPTH_SCALE = [
//   {
//     "value": 0,
//     "color": [0, 155, 104, 255]
//   },
//   {
//     "value": 1,
//     "color": [0, 155, 104, 255]
//   },
//   {
//     "value": 4,
//     "color": [0, 204, 255, 255]
//   },
//   {
//     "value": 12,
//     "color": [253, 191, 75, 255]
//   },
//   {
//     "value": 24,
//     "color": [254, 77, 76, 255]
//   },
//   {
//     "value": 48,
//     "color": [215, 77, 254, 255]
//   }
// ]

// Flood-depth: 5 uniformly-spaced stops (teal→blue→amber→red→purple)
function interpolateFloodDepth(t: number): string {
  const s: Array<[number, number, number]> = [
    [0, 155, 104],
    [0, 204, 255],
    [253, 191, 75],
    [254, 77, 76],
    [215, 77, 254],
  ];
  const n = s.length - 1;
  const idx = Math.min(t * n, n - 1e-10);
  const i = Math.floor(idx);
  return lerpRgb(s[i], s[Math.min(i + 1, n)], idx - i);
}

// MRMS precipitation: 6 stops at non-uniform positions matching the COG shader ramp
function interpolateMrmsPrecip(t: number): string {
  const s: Array<[number, [number, number, number]]> = [
    [0.0, [143, 196, 250]],
    [0.18, [26, 242, 219]],
    [0.42, [82, 250, 115]],
    [0.68, [245, 214, 51]],
    [0.88, [250, 97, 194]],
    [0.95, [230, 110, 220]],
    [1.0, [160, 70, 220]],
  ];
  let i = s.length - 2;
  for (let j = 0; j < s.length - 1; j++) {
    if (t <= s[j + 1][0]) {
      i = j;
      break;
    }
  }
  const [t0, c0] = s[i];
  const [t1, c1] = s[Math.min(i + 1, s.length - 1)];
  const f = t1 === t0 ? 1 : Math.max(0, Math.min(1, (t - t0) / (t1 - t0)));
  return lerpRgb(c0, c1, f);
}

// Operational-style precipitation ramp:
// dark/light blue -> green -> yellow -> orange -> red -> magenta -> purple
// This keeps light rain subdued and reserves the pink/purple tail for only the
// most extreme rates.
function interpolateMrmsPrecipOperational(t: number): string {
  const s: Array<[number, [number, number, number]]> = [
    [0.0, [18, 38, 72]],
    [0.08, [60, 115, 196]],
    [0.18, [92, 180, 255]],
    [0.34, [48, 201, 126]],
    [0.52, [226, 232, 69]],
    [0.68, [255, 171, 56]],
    [0.82, [241, 92, 63]],
    [0.92, [219, 67, 159]],
    [1.0, [130, 62, 196]],
  ];
  let i = s.length - 2;
  for (let j = 0; j < s.length - 1; j++) {
    if (t <= s[j + 1][0]) {
      i = j;
      break;
    }
  }
  const [t0, c0] = s[i];
  const [t1, c1] = s[Math.min(i + 1, s.length - 1)];
  const f = t1 === t0 ? 1 : Math.max(0, Math.min(1, (t - t0) / (t1 - t0)));
  return lerpRgb(c0, c1, f);
}

function interpolateFromStops(stops: Array<[number, number, number]>, t: number): string {
  const n = stops.length - 1;
  const idx = Math.min(t * n, n - 1e-10);
  const i = Math.floor(idx);
  return lerpRgb(stops[i], stops[Math.min(i + 1, n)], idx - i);
}

function interpolateHeatmapFire(t: number): string {
  return interpolateFromStops(
    [
      [0, 0, 255],
      [0, 128, 255],
      [0, 255, 255],
      [0, 255, 128],
      [255, 255, 0],
      [255, 128, 0],
      [255, 0, 0],
    ],
    t
  );
}

function interpolateHeatmapGyr(t: number): string {
  return interpolateFromStops(
    [
      [0, 200, 0],
      [100, 220, 0],
      [200, 240, 0],
      [255, 200, 0],
      [255, 100, 0],
      [220, 0, 0],
    ],
    t
  );
}

const INTERPOLATORS: Record<string, Interpolator> = {
  // Diverging
  BrBG: interpolateBrBG,
  PiYG: interpolatePiYG,
  PRGn: interpolatePRGn,
  PuOr: interpolatePuOr,
  RdBu: interpolateRdBu,
  RdGy: interpolateRdGy,
  RdYlBu: interpolateRdYlBu,
  RdYlGn: interpolateRdYlGn,
  Spectral: interpolateSpectral,
  // Sequential multi-hue
  Turbo: interpolateTurbo,
  Cividis: interpolateCividis,
  Viridis: interpolateViridis,
  Magma: interpolateMagma,
  Inferno: interpolateInferno,
  Plasma: interpolatePlasma,
  Warm: interpolateWarm,
  Cool: interpolateCool,
  Cubehelix: interpolateCubehelixDefault,
  BuGn: interpolateBuGn,
  BuPu: interpolateBuPu,
  GnBu: interpolateGnBu,
  OrRd: interpolateOrRd,
  PuBuGn: interpolatePuBuGn,
  PuBu: interpolatePuBu,
  PuRd: interpolatePuRd,
  RdPu: interpolateRdPu,
  YlGnBu: interpolateYlGnBu,
  YlGn: interpolateYlGn,
  YlOrBr: interpolateYlOrBr,
  YlOrRd: interpolateYlOrRd,
  // Single-hue
  Blues: interpolateBlues,
  Greens: interpolateGreens,
  Greys: interpolateGreys,
  Oranges: interpolateOranges,
  Purples: interpolatePurples,
  Reds: interpolateReds,
  // Domain-specific
  FloodDepth: interpolateFloodDepth,
  MrmsPrecip: interpolateMrmsPrecip,
  MrmsPrecipOperational: interpolateMrmsPrecipOperational,
  HeatmapFire: interpolateHeatmapFire,
  HeatmapGyr: interpolateHeatmapGyr,
};

export interface SchemeEntry {
  name: string;
  label: string;
  group: 'diverging' | 'sequential' | 'singlehue' | 'domain';
}

export const COLOR_SCHEMES: SchemeEntry[] = [
  // Domain-specific
  { name: 'FloodDepth', label: 'Flood Depth', group: 'domain' },
  { name: 'MrmsPrecip', label: 'MRMS Precipitation', group: 'domain' },
  { name: 'MrmsPrecipOperational', label: 'MRMS Precipitation (Operational)', group: 'domain' },
  { name: 'HeatmapFire', label: 'Heatmap Fire', group: 'domain' },
  { name: 'HeatmapGyr', label: 'Heatmap Green-Yellow-Red', group: 'domain' },
  // Diverging
  { name: 'Spectral', label: 'Spectral', group: 'diverging' },
  { name: 'RdYlGn', label: 'Red-Yellow-Green', group: 'diverging' },
  { name: 'RdYlBu', label: 'Red-Yellow-Blue', group: 'diverging' },
  { name: 'RdBu', label: 'Red-Blue', group: 'diverging' },
  { name: 'PiYG', label: 'Pink-Green', group: 'diverging' },
  { name: 'BrBG', label: 'Brown-Teal', group: 'diverging' },
  // Sequential multi-hue
  { name: 'Turbo', label: 'Turbo', group: 'sequential' },
  { name: 'Viridis', label: 'Viridis', group: 'sequential' },
  { name: 'Plasma', label: 'Plasma', group: 'sequential' },
  { name: 'Inferno', label: 'Inferno', group: 'sequential' },
  { name: 'Magma', label: 'Magma', group: 'sequential' },
  { name: 'Cividis', label: 'Cividis', group: 'sequential' },
  { name: 'Warm', label: 'Warm', group: 'sequential' },
  { name: 'Cool', label: 'Cool', group: 'sequential' },
  { name: 'YlOrRd', label: 'Yellow-Orange-Red', group: 'sequential' },
  { name: 'YlGnBu', label: 'Yellow-Green-Blue', group: 'sequential' },
  { name: 'PuBuGn', label: 'Purple-Blue-Green', group: 'sequential' },
  { name: 'OrRd', label: 'Orange-Red', group: 'sequential' },
  // Single-hue
  { name: 'Blues', label: 'Blues', group: 'singlehue' },
  { name: 'Greens', label: 'Greens', group: 'singlehue' },
  { name: 'Reds', label: 'Reds', group: 'singlehue' },
  { name: 'Oranges', label: 'Oranges', group: 'singlehue' },
  { name: 'Purples', label: 'Purples', group: 'singlehue' },
  { name: 'Greys', label: 'Greys', group: 'singlehue' },
];

function cssColorToRgba(str: string): [number, number, number, number] {
  const m = str.match(/\d+/g);
  if (!m) return [0, 0, 0, 255];
  return [parseInt(m[0], 10), parseInt(m[1], 10), parseInt(m[2], 10), 255];
}

export function interpolateScheme(schemeName: string, t: number, invert = false): [number, number, number, number] {
  const fn = INTERPOLATORS[schemeName];
  if (!fn) return [128, 128, 128, 255];
  const tt = invert ? 1 - t : t;
  return cssColorToRgba(fn(tt));
}

export function schemeToGradientCss(schemeName: string, invert = false, stops = 20): string {
  const fn = INTERPOLATORS[schemeName];
  if (!fn) return 'linear-gradient(to right, #888, #888)';
  const colors: string[] = [];
  for (let i = 0; i <= stops; i++) {
    const t = invert ? 1 - i / stops : i / stops;
    colors.push(fn(t));
  }
  return `linear-gradient(to right, ${colors.join(', ')})`;
}
