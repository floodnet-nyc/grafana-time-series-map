import {
  AmbientLight,
  DirectionalLight,
  LightingEffect,
  PointLight,
  _CameraLight as CameraLight,
  _SunLight as SunLight,
} from '@deck.gl/core';
import type { DeckLightConfig, DeckLightingOptions } from '../../types';

export const DEFAULT_DECK_LIGHTING: Required<DeckLightingOptions> = {
  enabled: false,
  lights: [
    { id: 'ambient-light', type: 'ambient', color: '255,255,255', intensity: 1 },
    {
      id: 'point-light-1',
      type: 'point',
      color: '255,255,255',
      intensity: 0.8,
      longitude: -0.144528,
      latitude: 49.739968,
      altitude: 80000,
      attenuationConstant: 1,
      attenuationLinear: 0,
      attenuationQuadratic: 0,
    },
    {
      id: 'point-light-2',
      type: 'point',
      color: '255,255,255',
      intensity: 0.8,
      longitude: -3.807751,
      latitude: 54.104682,
      altitude: 8000,
      attenuationConstant: 1,
      attenuationLinear: 0,
      attenuationQuadratic: 0,
    },
  ],
};

function parseRgb(value: string | undefined, fallback: [number, number, number]): [number, number, number] {
  if (!value) {
    return fallback;
  }
  const parts = value
    .split(',')
    .map((part) => Number(part.trim()))
    .filter(Number.isFinite);
  if (parts.length < 3) {
    return fallback;
  }
  return [
    Math.max(0, Math.min(255, parts[0])),
    Math.max(0, Math.min(255, parts[1])),
    Math.max(0, Math.min(255, parts[2])),
  ];
}

function lightNumber(light: DeckLightConfig, key: keyof DeckLightConfig, fallback: number) {
  const value = Number(light[key] ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

function createLight(light: DeckLightConfig) {
  const color = parseRgb(light.color, [255, 255, 255]);
  const intensity = lightNumber(light, 'intensity', 1);
  switch (light.type) {
    case 'ambient':
      return new AmbientLight({ id: light.id, color, intensity });
    case 'point':
      return new PointLight({
        id: light.id,
        color,
        intensity,
        position: [
          lightNumber(light, 'longitude', 0),
          lightNumber(light, 'latitude', 0),
          lightNumber(light, 'altitude', 1),
        ],
        attenuation: [
          lightNumber(light, 'attenuationConstant', 1),
          lightNumber(light, 'attenuationLinear', 0),
          lightNumber(light, 'attenuationQuadratic', 0),
        ],
      });
    case 'directional':
      return new DirectionalLight({
        id: light.id,
        color,
        intensity,
        direction: [
          lightNumber(light, 'directionX', 0),
          lightNumber(light, 'directionY', 0),
          lightNumber(light, 'directionZ', -1),
        ],
        _shadow: Boolean(light.shadow),
      });
    case 'camera':
      return new CameraLight({ id: light.id, color, intensity });
    case 'sun':
      return new SunLight({
        id: light.id,
        color,
        intensity,
        timestamp: lightNumber(light, 'timestamp', Date.now()),
        _shadow: Boolean(light.shadow),
      });
    default:
      return undefined;
  }
}

export function buildDeckEffects(options?: DeckLightingOptions) {
  if (!options?.enabled) {
    return [];
  }

  const lights = options.lights ?? [];
  const lightSources = Object.fromEntries(
    lights
      .map((light, index) => [light.id || `${light.type}-${index}`, createLight(light)])
      .filter((entry): entry is [string, NonNullable<ReturnType<typeof createLight>>] => Boolean(entry[1])),
  );
  return [new LightingEffect(lightSources)];
}
