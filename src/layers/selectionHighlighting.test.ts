import type { Feature } from 'geojson';
import { createSourceRef } from './defaults';
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
  it('uses selectionKey for scatterplot selection styling', () => {
    const { features, ...shared } = createBaseContext();
    const [layer] = scatterplotLayerDefinition.renderLayers({
      ...shared,
      features,
      config: {
        id: 'scatter-1',
        type: 'scatterplot',
        label: 'Scatter',
        visible: true,
        data: { featureSource: { id: 'main', refId: '' } },
        settings: {
          radiusMinPixels: 4,
          radiusMaxPixels: 20,
          radius: createSourceRef(),
          radiusScale: 1,
          elevation: createSourceRef(),
          elevationScale: 1,
          depthTest: false,
          stroked: true,
          showLabels: false,
          label: createSourceRef(),
        },
        geometry: { type: 'latlng', lat: createSourceRef('lat'), lng: createSourceRef('lng') },
        timeFilter: { mode: 'none', time: createSourceRef(), groupBy: createSourceRef('sensor_id') },
            opacity: 1,
        selectionKey: createSourceRef('deployment_id'),
      },
    } as LayerRenderContext<any>);

    expect((layer as any).props.getLineColor(features[0])).toEqual([255, 230, 60, 255]);
    expect((layer as any).props.getLineColor(features[1])).toEqual([200, 200, 240, 60]);
  });

  it('uses selectionKey for icon selection styling', () => {
    const { features, ...shared } = createBaseContext();
    const [layer] = iconLayerDefinition.renderLayers({
      ...shared,
      features,
      config: {
        id: 'icon-1',
        type: 'icon',
        label: 'Icon',
        visible: true,
        data: { featureSource: { id: 'main', refId: '' } },
        settings: {
          fixedIcon: 'marker',
          icon: createSourceRef(),
          iconAtlasUrl: '',
          iconMappingUrl: '',
          elevation: createSourceRef(),
          elevationScale: 1,
          depthTest: false,
          sizeScale: 32,
          sizeMinPixels: 8,
          sizeMaxPixels: 64,
          size: createSourceRef(),
          billboard: true,
          alphaCutoff: 0.05,
        },
        geometry: { type: 'latlng', lat: createSourceRef('lat'), lng: createSourceRef('lng') },
        timeFilter: { mode: 'none', time: createSourceRef(), groupBy: createSourceRef('sensor_id') },
            opacity: 1,
        selectionKey: createSourceRef('deployment_id'),
      },
    } as LayerRenderContext<any>);

    expect((layer as any).props.getColor(features[0])).toEqual([255, 230, 60, 255]);
    expect((layer as any).props.getColor(features[1])).not.toEqual([255, 230, 60, 255]);
  });

  it('uses selectionKey for text selection styling', () => {
    const { features, ...shared } = createBaseContext();
    const [layer] = textLayerDefinition.renderLayers({
      ...shared,
      features,
      config: {
        id: 'text-1',
        type: 'text',
        label: 'Text',
        visible: true,
        data: { featureSource: { id: 'main', refId: '' } },
        settings: {
          text: createSourceRef('label'),
          fontSize: 14,
          sizeMinPixels: 6,
          sizeMaxPixels: 64,
          size: createSourceRef(),
          sizeScale: 1,
          elevation: createSourceRef(),
          elevationScale: 1,
          depthTest: false,
          fontFamily: 'Helvetica Neue, Verdana, Roboto, sans-serif',
          fontWeight: 'normal',
          anchor: 'middle',
          baseline: 'center',
          billboard: true,
          background: false,
          pixelOffsetX: 0,
          pixelOffsetY: 0,
          autoDecimals: false,
        },
        geometry: { type: 'latlng', lat: createSourceRef('lat'), lng: createSourceRef('lng') },
        timeFilter: { mode: 'none', time: createSourceRef(), groupBy: createSourceRef('sensor_id') },
            opacity: 1,
        selectionKey: createSourceRef('deployment_id'),
      },
    } as LayerRenderContext<any>);

    expect((layer as any).props.getColor(features[0])).toEqual([255, 230, 60, 255]);
    expect((layer as any).props.getColor(features[1])).not.toEqual([255, 230, 60, 255]);
  });
});
