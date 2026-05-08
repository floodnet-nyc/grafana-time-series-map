import type { ColorScaleConfig, ColorStep } from '../../types';
import type { Feature } from 'geojson';
import { interpolateScheme } from './colorSchemes';

export type RGBA = [number, number, number, number];

// ── CPU color accessor ────────────────────────────────────────────────────────

function thresholdToColor(steps: ColorStep[], value: number): RGBA {
  // steps must be sorted ascending. Return color of last step whose value <= input.
  let color = steps[0].color;
  for (const step of steps) {
    if (value >= step.value) { color = step.color; }
  }
  return color;
}

export function buildColorAccessor(
  colorScale: ColorScaleConfig | undefined,
  defaultColor: RGBA = [0, 155, 104, 255],
): (feature: Feature) => RGBA {
  if (!colorScale) { return () => defaultColor; }
  if (colorScale.type === 'fixed') { return () => colorScale.fixedColor ?? defaultColor; }

  if (colorScale.type === 'threshold' && colorScale.steps?.length && colorScale.field) {
    const steps = [...colorScale.steps].sort((a, b) => a.value - b.value);
    const field = colorScale.field;
    return (f: Feature) => thresholdToColor(steps, Number(f.properties?.[field] ?? 0));
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

// ── Palette array builder (for uniform-based shaders) ────────────────────────

const PALETTE_N = 32;

export function buildPaletteArrays(
  colorScale: ColorScaleConfig,
  n: number = PALETTE_N,
): { r: Float32Array; g: Float32Array; b: Float32Array; scaleMin: number; scaleMax: number } {
  const r = new Float32Array(n);
  const g = new Float32Array(n);
  const b = new Float32Array(n);

  const sorted =
    colorScale.type === 'threshold' && colorScale.steps?.length
      ? [...colorScale.steps].sort((a, b) => a.value - b.value)
      : null;

  // For threshold scales, derive range from step values when not explicitly set.
  const scaleMin = colorScale.scaleMin ?? (sorted ? sorted[0].value : 0);
  const scaleMax = colorScale.scaleMax ?? (sorted ? sorted[sorted.length - 1].value : 1);
  const range = scaleMax - scaleMin || 1;

  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    let rgba: RGBA;
    if (colorScale.type === 'gradient' && colorScale.schemeName) {
      rgba = interpolateScheme(colorScale.schemeName, t, colorScale.invert ?? false);
    } else if (sorted) {
      rgba = thresholdToColor(sorted, scaleMin + t * range);
    } else {
      rgba = [128, 128, 128, 255];
    }
    r[i] = rgba[0] / 255;
    g[i] = rgba[1] / 255;
    b[i] = rgba[2] / 255;
  }

  return { r, g, b, scaleMin, scaleMax };
}

// ── GLSL shader generation ────────────────────────────────────────────────────

export const DEFAULT_VS_FILTER_COLOR = `\
float v = instanceValue;
color = interpolateColor(v);`;

export const DEFAULT_FS_FILTER_COLOR = `\
float v = vInstanceValue;
color = interpolateColor(v);`;

/**
 * Generates a GLSL `vec4 interpolateColor(float v)` function body.
 * Works in both vertex and fragment shader contexts (pure math, no varyings).
 *
 * For type='threshold': generates a discrete step function from the steps array.
 * For type='gradient':  samples the named d3 interpolator into a 16-entry palette array.
 */
export function buildInterpolateColorGlsl(colorScale: ColorScaleConfig, paletteSteps = 16): string {
  // ── Threshold: discrete step function ─────────────────────────────────────
  if (colorScale.type === 'threshold' && colorScale.steps?.length) {
    const sorted = [...colorScale.steps].sort((a, b) => a.value - b.value);
    const lines: string[] = ['vec4 interpolateColor(float v) {'];
    // Emit from highest threshold down so first match wins
    for (let i = sorted.length - 1; i >= 1; i--) {
      const { value, color } = sorted[i];
      const [r, g, b, a] = color.map((c) => (c / 255).toFixed(4));
      lines.push(`  if (v >= ${value.toFixed(2)}) return vec4(${r}, ${g}, ${b}, ${a});`);
    }
    // Base color (below first threshold)
    const [r, g, b, a] = sorted[0].color.map((c) => (c / 255).toFixed(4));
    lines.push(`  return vec4(${r}, ${g}, ${b}, ${a});`);
    lines.push('}');
    return lines.join('\n');
  }

  // ── Gradient: bake d3 interpolator into a palette array ───────────────────
  const { schemeName, scaleMin = 0, scaleMax = 1, invert = false } = colorScale;
  const range = scaleMax - scaleMin || 1;

  const palette: Array<[number, number, number]> = [];
  for (let i = 0; i < paletteSteps; i++) {
    const t = i / (paletteSteps - 1);
    const rgba = schemeName
      ? interpolateScheme(schemeName, t, invert)
      : ([128, 128, 128, 255] as RGBA);
    palette.push([rgba[0], rgba[1], rgba[2]]);
  }

  const paletteLines = palette
    .map(
      (c, i) =>
        `  palette[${i}] = vec3(${(c[0] / 255).toFixed(4)}, ${(c[1] / 255).toFixed(4)}, ${(c[2] / 255).toFixed(4)});`,
    )
    .join('\n');

  return `\
vec4 interpolateColor(float v) {
  float vn = clamp((v - ${scaleMin.toFixed(4)}) / ${range.toFixed(4)}, 0.0, 1.0);
  vec3 palette[${paletteSteps}];
${paletteLines}
  float idx = vn * ${(paletteSteps - 1).toFixed(1)};
  int i = clamp(int(floor(idx)), 0, ${paletteSteps - 2});
  float t = fract(idx);
  return vec4(mix(palette[i], palette[i + 1], t), 1.0);
}`;
}
