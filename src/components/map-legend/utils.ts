import type { ColorScaleConfig, ColorStep } from '../../types';
import type { LayerConfig } from '../../layers';
import { DEFAULT_BUILT_IN_ICON, isBuiltInIconName, resolveBuiltInIcon } from '../../layers/icon/builtInIcons';

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

export function hasColorLegendContent(colorScale: ColorScaleConfig | undefined): boolean {
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

export function getLegendIconDefinition(layer: LayerConfig) {
  if (layer.type !== 'icon') {
    return undefined;
  }

  const settings = layer.settings as {
    fixedIcon?: string;
    iconAtlasUrl?: string;
    iconMappingUrl?: string;
  };
  const fixedIcon = settings.fixedIcon?.trim() || DEFAULT_BUILT_IN_ICON;

  if (isBuiltInIconName(fixedIcon)) {
    return resolveBuiltInIcon(fixedIcon);
  }

  if (!settings.iconAtlasUrl?.trim() || !settings.iconMappingUrl?.trim()) {
    return resolveBuiltInIcon(DEFAULT_BUILT_IN_ICON);
  }

  return undefined;
}

export function hasLegendContent(layer: LayerConfig): boolean {
  return hasColorLegendContent(layer.colorScale) || !!getLegendIconDefinition(layer);
}

export function getLegendEntries(layers: LayerConfig[]): LayerConfig[] {
  return layers.filter((layer) => (layer.showInLegend ?? true) && hasLegendContent(layer));
}
