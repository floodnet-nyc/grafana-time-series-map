import type { ColorScaleConfig, ColorStep } from '../../types';
import type { Feature } from 'geojson';
import type { AccessorContext, AccessorFunction } from '@deck.gl/core';
import { interpolateScheme } from './colorSchemes';

export type RGBA = [number, number, number, number];

// ── CPU color accessor ────────────────────────────────────────────────────────

function thresholdToColor(steps: ColorStep[], value: number): RGBA {
  // steps must be sorted ascending. Return color of last step whose value <= input.
  let color = steps[0].color;
  for (const step of steps) {
    if (value >= step.value) {
      color = step.color;
    }
  }
  return color;
}

function normalizeValue(value: number, scaleMin: number, scaleMax: number): number {
  const range = scaleMax - scaleMin || 1;
  return Math.max(0, Math.min(1, (value - scaleMin) / range));
}

function getScaledAlpha(colorScale: ColorScaleConfig, value: number, baseAlpha: number): number {
  if (
    colorScale.alphaMin === undefined &&
    colorScale.alphaMax === undefined &&
    colorScale.alphaGamma === undefined
  ) {
    return baseAlpha;
  }

  const scaleMin = colorScale.scaleMin ?? 0;
  const thresholdValues = colorScale.steps?.map((step) => step.value) ?? [];
  const scaleMax =
    colorScale.scaleMax ??
    (colorScale.type === 'threshold' && thresholdValues.length
      ? Math.max(...thresholdValues)
      : 1);
  const resolvedScaleMin =
    colorScale.scaleMin ??
    (colorScale.type === 'threshold' && thresholdValues.length
      ? Math.min(...thresholdValues)
      : scaleMin);
  const alphaMin = colorScale.alphaMin ?? 0;
  const alphaMax = colorScale.alphaMax ?? 1;
  const alphaGamma = colorScale.alphaGamma ?? 1;
  const an = Math.pow(normalizeValue(value, resolvedScaleMin, scaleMax), alphaGamma);
  return Math.max(0, Math.min(1, baseAlpha * (alphaMin + (alphaMax - alphaMin) * an)));
}

export function buildColorAccessor<TDatum>(
  colorScale: ColorScaleConfig | undefined,
  defaultColor: RGBA = [0, 155, 104, 255],
  getValue?: AccessorFunction<TDatum, number>
): AccessorFunction<TDatum, RGBA> {
  if (!colorScale) {
    return () => defaultColor;
  }
  if (colorScale.type === 'fixed') {
    return () => colorScale.fixedColor ?? defaultColor;
  }

  if (colorScale.type === 'threshold' && colorScale.steps?.length && colorScale.field) {
    const steps = [...colorScale.steps].sort((a, b) => a.value - b.value);
    const field = colorScale.field.field;
    return (datum: TDatum, ctx: AccessorContext<TDatum>) => {
      const raw = getValue ? getValue(datum, ctx) : Number((datum as Feature).properties?.[field]);
      const value = Number.isFinite(raw) ? raw : 0;
      const color = thresholdToColor(steps, value);
      const alpha = Math.round(255 * getScaledAlpha(colorScale, value, color[3] / 255));
      return [color[0], color[1], color[2], alpha];
    };
  }

  if (colorScale.schemeName && colorScale.field) {
    const { schemeName, scaleMin = 0, scaleMax = 1, invert = false } = colorScale;
    const field = colorScale.field.field;
    return (datum: TDatum, ctx: AccessorContext<TDatum>) => {
      const raw = getValue ? getValue(datum, ctx) : Number((datum as Feature).properties?.[field]);
      const v = Number.isFinite(raw) ? raw : scaleMin;
      const t = normalizeValue(v, scaleMin, scaleMax);
      const color = interpolateScheme(schemeName, t, invert);
      const alpha = Math.round(255 * getScaledAlpha(colorScale, v, color[3] / 255));
      return [color[0], color[1], color[2], alpha];
    };
  }

  return () => defaultColor;
}

export function buildColorRange(colorScale: ColorScaleConfig | undefined, fallbackSchemeName: string, n = 6): RGBA[] {
  const steps = Math.max(2, n);

  if (!colorScale) {
    return Array.from({ length: steps }, (_, index) => interpolateScheme(fallbackSchemeName, index / (steps - 1)));
  }

  if (colorScale.type === 'fixed') {
    return Array.from({ length: steps }, () => colorScale.fixedColor ?? [128, 128, 128, 255]);
  }

  if (colorScale.type === 'threshold' && colorScale.steps?.length) {
    const sorted = [...colorScale.steps].sort((a, b) => a.value - b.value);
    const scaleMin = colorScale.scaleMin ?? sorted[0].value;
    const scaleMax = colorScale.scaleMax ?? sorted[sorted.length - 1].value;
    const range = scaleMax - scaleMin || 1;
    return Array.from({ length: steps }, (_, index) => {
      const t = index / (steps - 1);
      return thresholdToColor(sorted, scaleMin + t * range);
    });
  }

  const schemeName = colorScale.schemeName ?? fallbackSchemeName;
  return Array.from({ length: steps }, (_, index) =>
    interpolateScheme(schemeName, index / (steps - 1), colorScale.invert ?? false)
  );
}

// ── Palette array builder (for uniform-based shaders) ────────────────────────

const PALETTE_N = 32;

export function buildPaletteArrays(
  colorScale: ColorScaleConfig,
  n: number = PALETTE_N
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
    const t = n <= 1 ? 0 : i / (n - 1);
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
  paletteSteps = Math.max(2, paletteSteps);
  const alphaMin = colorScale.alphaMin;
  const alphaMax = colorScale.alphaMax;
  const alphaGamma = colorScale.alphaGamma ?? 1;
  const hasScaledAlpha = alphaMin !== undefined || alphaMax !== undefined || colorScale.alphaGamma !== undefined;
  const derivedScaleMin =
    colorScale.scaleMin ??
    (colorScale.type === 'threshold' && colorScale.steps?.length ? colorScale.steps[0].value : 0);
  const derivedScaleMax =
    colorScale.scaleMax ??
    (colorScale.type === 'threshold' && colorScale.steps?.length
      ? colorScale.steps[colorScale.steps.length - 1].value
      : 1);
  const alphaDecl = hasScaledAlpha
    ? `float applyScaledAlpha(float v, float baseAlpha) {
  float vn = clamp((v - ${derivedScaleMin.toFixed(4)}) / ${(derivedScaleMax - derivedScaleMin || 1).toFixed(4)}, 0.0, 1.0);
  float an = pow(vn, ${alphaGamma.toFixed(4)});
  float scaled = mix(${(alphaMin ?? 0).toFixed(4)}, ${(alphaMax ?? 1).toFixed(4)}, an);
  return clamp(baseAlpha * scaled, 0.0, 1.0);
}
`
    : '';
  // ── Threshold: discrete step function ─────────────────────────────────────
  if (colorScale.type === 'threshold' && colorScale.steps?.length) {
    const sorted = [...colorScale.steps].sort((a, b) => a.value - b.value);
    const lines: string[] = [alphaDecl, 'vec4 interpolateColor(float v) {', '  vec4 c;'];
    // Emit from highest threshold down so first match wins
    for (let i = sorted.length - 1; i >= 1; i--) {
      const { value, color } = sorted[i];
      const [r, g, b, a] = color.map((c) => (c / 255).toFixed(4));
      lines.push(`  ${i === sorted.length - 1 ? 'if' : 'else if'} (v >= ${value.toFixed(2)}) c = vec4(${r}, ${g}, ${b}, ${a});`);
    }
    // Base color (below first threshold)
    const [r, g, b, a] = sorted[0].color.map((c) => (c / 255).toFixed(4));
    lines.push(`  else c = vec4(${r}, ${g}, ${b}, ${a});`);
    if (hasScaledAlpha) {
      lines.push('  c.a = applyScaledAlpha(v, c.a);');
    }
    lines.push('  return c;');
    lines.push('}');
    return lines.join('\n');
  }

  // ── Gradient: bake d3 interpolator into a palette array ───────────────────
  const { schemeName, scaleMin = 0, scaleMax = 1, invert = false } = colorScale;
  const range = scaleMax - scaleMin || 1;

  const palette: RGBA[] = [];
  for (let i = 0; i < paletteSteps; i++) {
    const t = i / (paletteSteps - 1); // paletteSteps >= 2 guaranteed above
    const rgba = schemeName ? interpolateScheme(schemeName, t, invert) : ([128, 128, 128, 255] as RGBA);
    palette.push(rgba);
  }

  const paletteLines = palette
    .map(
      (c, i) =>
        `  palette[${i}] = vec4(${(c[0] / 255).toFixed(4)}, ${(c[1] / 255).toFixed(4)}, ${(c[2] / 255).toFixed(4)}, ${(c[3] / 255).toFixed(4)});`
    )
    .join('\n');

  return `\
${alphaDecl}\
vec4 interpolateColor(float v) {
  float vn = clamp((v - ${scaleMin.toFixed(4)}) / ${range.toFixed(4)}, 0.0, 1.0);
  vec4 palette[${paletteSteps}];
${paletteLines}
  if (vn >= 1.0) {
    vec4 c = palette[${paletteSteps - 1}];
    ${hasScaledAlpha ? 'c.a = applyScaledAlpha(v, c.a);' : ''}
    return c;
  }
  float idx = vn * ${(paletteSteps - 1).toFixed(1)};
  int i = clamp(int(floor(idx)), 0, ${paletteSteps - 2});
  float t = fract(idx);
  vec4 c = mix(palette[i], palette[i + 1], t);
  ${hasScaledAlpha ? 'c.a = applyScaledAlpha(v, c.a);' : ''}
  return c;
}`;
}
