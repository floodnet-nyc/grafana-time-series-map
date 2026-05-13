import type { Layer } from '@deck.gl/core';

export function numericOption(options: Record<string, unknown>, key: string, fallback: number) {
  const value = Number(options[key] ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

export function getFeatureProperties(datum: any) {
  return datum?.feature?.properties ?? datum?.properties ?? {};
}

/** Read the live props of a deck.gl layer (not in the public type surface). */
export function getLayerProps(layer: Layer): Record<string, unknown> {
  return (layer as any).props ?? {};
}

/** Read the static defaultProps of a deck.gl layer constructor. */
export function getLayerDefaultProps(layer: Layer): Record<string, unknown> {
  return (layer as any).constructor?.defaultProps ?? {};
}
