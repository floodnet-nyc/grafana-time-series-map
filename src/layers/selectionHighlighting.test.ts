import type { Feature } from 'geojson';
import type { LayerRenderContext } from './types';
import { iconLayerDefinition } from './icon';
import { scatterplotLayerDefinition } from './scatterplot';
import { textLayerDefinition } from './text';

jest.mock('@deck.gl/layers', () => ({
  ScatterplotLayer: class MockScatterplotLayer {
    props: Record<string, unknown>;
    constructor(props: Record<string, unknown>) {
      this.props = props;
    }
  },
  IconLayer: class MockIconLayer {
    props: Record<string, unknown>;
    constructor(props: Record<string, unknown>) {
      this.props = props;
    }
  },
  TextLayer: class MockTextLayer {
    props: Record<string, unknown>;
    constructor(props: Record<string, unknown>) {
      this.props = props;
    }
  },
}));

function createFeature(properties: Record<string, unknown>): Feature {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [-73.9, 40.7],
    },
    properties,
  };
}

function createBaseContext() {
  const selected = createFeature({ deployment_id: 'sensor-1', sensor_id: 'group-a', label: 'Selected' });
  const unselected = createFeature({ deployment_id: 'sensor-2', sensor_id: 'group-a', label: 'Other' });

  return {
    panelOptions: {} as any,
    features: [selected, unselected],
    cursorTimeMs: 0,
    fromTimeMs: 0,
    toTimeMs: 0,
    timeFilterFlags: new Uint8Array([1, 1]),
    selectedKey: 'sensor-1',
  };
}

describe('layer selection highlighting', () => {
  it('uses selectionKeyField for scatterplot selection styling', () => {
    const { features, ...shared } = createBaseContext();
    const [layer] = scatterplotLayerDefinition.renderLayers({
      ...shared,
      features,
      config: {
        id: 'scatter-1',
        type: 'scatterplot',
        label: 'Scatter',
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
        geometry: { type: 'latlng', latField: 'lat', lngField: 'lng' },
        timeFilter: { mode: 'none', timeField: '', groupByField: 'sensor_id' },
            opacity: 1,
        selectionKeyField: 'deployment_id',
      },
    } as LayerRenderContext<any>);

    expect((layer as any).props.getLineColor(features[0])).toEqual([255, 230, 60, 255]);
    expect((layer as any).props.getLineColor(features[1])).toEqual([200, 200, 240, 60]);
  });

  it('uses selectionKeyField for icon selection styling', () => {
    const { features, ...shared } = createBaseContext();
    const [layer] = iconLayerDefinition.renderLayers({
      ...shared,
      features,
      config: {
        id: 'icon-1',
        type: 'icon',
        label: 'Icon',
        visible: true,
        settings: {
          fixedIcon: 'marker',
          iconField: '',
          iconAtlasUrl: '',
          iconMappingUrl: '',
          sizeScale: 32,
          sizeMinPixels: 8,
          sizeMaxPixels: 64,
          sizeField: '',
          billboard: true,
          alphaCutoff: 0.05,
        },
        geometry: { type: 'latlng', latField: 'lat', lngField: 'lng' },
        timeFilter: { mode: 'none', timeField: '', groupByField: 'sensor_id' },
            opacity: 1,
        selectionKeyField: 'deployment_id',
      },
    } as LayerRenderContext<any>);

    expect((layer as any).props.getColor(features[0])).toEqual([255, 230, 60, 255]);
    expect((layer as any).props.getColor(features[1])).not.toEqual([255, 230, 60, 255]);
  });

  it('uses selectionKeyField for text selection styling', () => {
    const { features, ...shared } = createBaseContext();
    const [layer] = textLayerDefinition.renderLayers({
      ...shared,
      features,
      config: {
        id: 'text-1',
        type: 'text',
        label: 'Text',
        visible: true,
        settings: {
          textField: 'label',
          fontSize: 14,
          sizeMinPixels: 6,
          sizeMaxPixels: 64,
          sizeField: '',
          fontFamily: 'Helvetica Neue, Verdana, Roboto, sans-serif',
          fontWeight: 'normal',
          anchor: 'middle',
          baseline: 'center',
          billboard: true,
          background: false,
          pixelOffsetX: 0,
          pixelOffsetY: 0,
        },
        geometry: { type: 'latlng', latField: 'lat', lngField: 'lng' },
        timeFilter: { mode: 'none', timeField: '', groupByField: 'sensor_id' },
            opacity: 1,
        selectionKeyField: 'deployment_id',
      },
    } as LayerRenderContext<any>);

    expect((layer as any).props.getColor(features[0])).toEqual([255, 230, 60, 255]);
    expect((layer as any).props.getColor(features[1])).not.toEqual([255, 230, 60, 255]);
  });
});
