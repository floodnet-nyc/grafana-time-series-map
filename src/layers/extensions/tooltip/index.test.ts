import type { Layer } from '@deck.gl/core';
import type { ScatterplotLayerConfig } from '../../types';
import { buildDeckTooltip, createDefaultTooltipConfig } from './index';

function createFeature(properties: Record<string, unknown>, index = 0) {
  return {
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [0, 0] as [number, number] },
    properties,
    __idx: index,
  };
}

function createConfig(): ScatterplotLayerConfig {
  return {
    id: 'layer-1',
    type: 'scatterplot',
    label: 'Sensor Layer',
    visible: true,
    settings: {
      radiusMinPixels: 4,
      radiusMaxPixels: 20,
      radiusField: '',
      radiusScale: 1,
      stroked: true,
      showLabels: false,
      labelField: '',
    },
    geometry: { type: 'none' },
    timeFilter: { mode: 'none', timeField: 'time' },
    fieldMappings: [],
    opacity: 1,
    secondarySources: [
      {
        queryRefId: 'A',
        join: {
          type: 'keyed-asof',
          localKeyField: 'deployment_id',
          remoteKeyField: 'deployment_id',
          timeField: 'time',
        },
        fields: [{ sourceField: 'depth_inches' }],
      },
    ],
    extensions: {
      tooltip: {
        enabled: true,
        template: '<div>{{layer.label}} {{this.deployment_id}} {{A.depth_inches}} {{derived.depthDiff}}</div>',
      },
    },
  };
}

describe('tooltip extension', () => {
  it('returns sane defaults', () => {
    expect(createDefaultTooltipConfig()).toEqual({
      enabled: false,
      template: expect.stringContaining('{{layer.label}}'),
    });
  });

  it('renders tooltip HTML from feature, secondary source, and derived scope', () => {
    const config = createConfig();
    const feature = createFeature({ deployment_id: 'sensor-1' }, 0);
    const layer = {
      id: 'scatterplot/layer-1',
      props: {
        id: 'scatterplot/layer-1',
        tooltipTemplate: config.extensions?.tooltip?.template,
      },
    } as unknown as Layer;

    const getTooltip = buildDeckTooltip([
      {
        config,
        features: [feature],
        timeFilterFlags: new Uint8Array([1]),
        secondarySourceValues: new Map([['A', new Map([['sensor-1', { depth_inches: 12.5 }]])]]),
        derivedValues: [{ depthDiff: 1.25 }],
      },
    ]);

    expect(getTooltip({ layer, object: feature } as any)).toEqual(
      expect.objectContaining({
        html: '<div>Sensor Layer sensor-1 12.5 1.25</div>',
      }),
    );
  });

  it('escapes interpolated values', () => {
    const config = createConfig();
    const feature = createFeature({ deployment_id: '<script>alert(1)</script>' }, 0);
    const layer = {
      id: 'scatterplot/layer-1',
      props: {
        id: 'scatterplot/layer-1',
        tooltipTemplate: '<div>{{this.deployment_id}}</div>',
      },
    } as unknown as Layer;

    const getTooltip = buildDeckTooltip([
      {
        config,
        features: [feature],
        timeFilterFlags: new Uint8Array([1]),
      },
    ]);

    expect(getTooltip({ layer, object: feature } as any)).toEqual(
      expect.objectContaining({
        html: '<div>&lt;script&gt;alert(1)&lt;/script&gt;</div>',
      }),
    );
  });
});
