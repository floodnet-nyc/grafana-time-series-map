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
};

export interface SchemeEntry {
  name: string;
  label: string;
  group: 'diverging' | 'sequential' | 'singlehue';
}

export const COLOR_SCHEMES: SchemeEntry[] = [
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

export function interpolateScheme(
  schemeName: string,
  t: number,
  invert = false,
): [number, number, number, number] {
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
