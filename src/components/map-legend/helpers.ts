import type { ColorScaleConfig, ColorStep, LayerConfig } from '../../types';

export const SMALL_PANEL_THRESHOLD = 400;

export function swatchHex([r, g, b]: [number, number, number, number]): string {
  const channelToHex = (channel: number) =>
    Math.round(Math.max(0, Math.min(255, channel)))
      .toString(16)
      .padStart(2, '0');

  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`;
}

export function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function sortThresholdSteps(steps: ColorStep[]): ColorStep[] {
  return [...steps].sort((left, right) => left.value - right.value);
}

export function hasLegendContent(colorScale: ColorScaleConfig | undefined): boolean {
  if (!colorScale) {
    return false;
  }

  if (colorScale.type === 'fixed') {
    return !!colorScale.fixedColor;
  }

  if (colorScale.type === 'threshold') {
    return (colorScale.steps?.length ?? 0) > 0;
  }

  return !!colorScale.schemeName;
}

export function getLegendEntries(layers: LayerConfig[]): LayerConfig[] {
  return layers.filter((layer) => (layer.showInLegend ?? true) && hasLegendContent(layer.colorScale));
}
