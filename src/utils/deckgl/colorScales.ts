import type { ColorScaleConfig } from '../../types';
import type { Feature } from 'geojson';
import { interpolateScheme } from './colorSchemes';

export type RGBA = [number, number, number, number];

const FLOOD_DEPTH_STEPS: Array<{ value: number; color: RGBA }> = [
  { value: 0,        color: [0,   155, 104, 255] },
  { value: 4,        color: [0,   204, 255, 255] },
  { value: 12,       color: [253, 191, 75,  255] },
  { value: 24,       color: [254, 77,  76,  255] },
  { value: 48,       color: [215, 77,  254, 255] },
];

const PRESETS: Record<string, Array<{ value: number; color: RGBA }>> = {
  floodDepth: FLOOD_DEPTH_STEPS,
};

function lerpColor(c1: RGBA, c2: RGBA, t: number): RGBA {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
    Math.round(c1[3] + (c2[3] - c1[3]) * t),
  ];
}

function stepsToColor(steps: Array<{ value: number; color: RGBA }>, value: number): RGBA {
  for (let i = 0; i < steps.length - 1; i++) {
    if (value <= steps[i + 1].value) {
      const t = (value - steps[i].value) / (steps[i + 1].value - steps[i].value);
      return lerpColor(steps[i].color, steps[i + 1].color, Math.max(0, Math.min(1, t)));
    }
  }
  return steps[steps.length - 1].color;
}

export function buildColorAccessor(
  colorScale: ColorScaleConfig | undefined,
  defaultColor: RGBA = [0, 155, 104, 255],
): (feature: Feature) => RGBA {
  if (!colorScale) { return () => defaultColor; }
  if (colorScale.type === 'fixed') { return () => colorScale.fixedColor ?? defaultColor; }

  const preset = colorScale.presetName ? PRESETS[colorScale.presetName] : undefined;
  if (preset && colorScale.field) {
    const field = colorScale.field;
    return (f: Feature) => stepsToColor(preset, Number(f.properties?.[field] ?? 0));
  }

  if (colorScale.schemeName && colorScale.field) {
    const { schemeName, field, scaleMin = 0, scaleMax = 1, invert = false } = colorScale;
    const range = scaleMax - scaleMin || 1;
    return (f: Feature) => {
      const t = Math.max(0, Math.min(1, (Number(f.properties?.[field] ?? 0) - scaleMin) / range));
      return interpolateScheme(schemeName, t, invert);
    };
  }

  return () => defaultColor;
}

// ─── Auto-generate interpolateColor(float v) GLSL from colorScale settings ───

export const DEFAULT_VS_FILTER_COLOR = `\
float v = instanceValue;
color = interpolateColor(v);
// // e.g. vary opacity with value:
// color.a = smoothstep(0.0, 1.0, v);`;

export function buildInterpolateColorGlsl(colorScale: ColorScaleConfig, steps = 16): string {
  const preset = colorScale.presetName ? PRESETS[colorScale.presetName] : undefined;
  const scaleMin = colorScale.scaleMin ?? (preset ? preset[0].value : 0);
  const scaleMax = colorScale.scaleMax ?? (preset ? preset[preset.length - 1].value : 1);
  const range = scaleMax - scaleMin || 1;
  const invert = colorScale.invert ?? false;
  console.log(preset, scaleMax, scaleMin);

  const palette: Array<[number, number, number]> = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    let rgba: RGBA;
    if (preset) {
      rgba = stepsToColor(preset, scaleMin + t * range);
    } else if (colorScale.schemeName) {
      rgba = interpolateScheme(colorScale.schemeName, t, invert);
    } else {
      rgba = [128, 128, 128, 255];
    }
    palette.push([rgba[0], rgba[1], rgba[2]]);
  }

  const paletteLines = palette
    .map((c, i) => `  palette[${i}] = vec3(${(c[0]/255).toFixed(4)}, ${(c[1]/255).toFixed(4)}, ${(c[2]/255).toFixed(4)});`)
    .join('\n');

  return `\
// Auto-generated: normalize v ∈ [${scaleMin}, ${scaleMax}] and look up palette
vec4 interpolateColor(float v) {
  float vn = clamp((v - ${scaleMin.toFixed(4)}) / ${range.toFixed(4)}, 0.0, 1.0);
  vec3 palette[${steps}];
${paletteLines}
  float idx = vn * ${(steps - 1).toFixed(1)};
  int i = clamp(int(floor(idx)), 0, ${steps - 2});
  float t = fract(idx);
  return vec4(mix(palette[i], palette[i + 1], t), 1.0);
}

// ── Custom scale examples (runs in vs:DECKGL_FILTER_COLOR) ──────────────────
// Log scale:  float vLog = log(max(v, 1.0)) / log(${scaleMax.toFixed(1)} + 1.0); color = interpolateColor(vLog * ${scaleMax.toFixed(1)});
// Exponential: color = interpolateColor(pow(v / ${scaleMax.toFixed(1)}, 2.0) * ${scaleMax.toFixed(1)});
// Fade low values: color.a *= smoothstep(0.0, ${(scaleMin + range * 0.1).toFixed(1)}, v);
// ────────────────────────────────────────────────────────────────────────────`;
}
