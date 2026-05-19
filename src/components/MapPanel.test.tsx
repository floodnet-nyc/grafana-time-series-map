import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { EventBus, PanelProps } from '@grafana/data';
import type { Feature } from 'geojson';
import type { MapPanelOptions } from '../types';
import { MapPanel } from './MapPanel';

const mockUsePlayback = jest.fn();
const mockUseGrafanaEventBridge = jest.fn();
const mockUsePanelFeatures = jest.fn();
const mockUseFitBounds = jest.fn();
const mockUsePanelLayers = jest.fn();
const mockLocationServicePartial = jest.fn();

let latestFeatureClick: ((feature: Feature, info: any) => void) | undefined;
let latestMapProps: any;

jest.mock('../hooks/usePlayback', () => ({
  usePlayback: (args: unknown) => mockUsePlayback(args),
}));

jest.mock('@grafana/runtime', () => ({
  locationService: {
    partial: (...args: unknown[]) => mockLocationServicePartial(...args),
  },
}));

jest.mock('../hooks/useGrafanaEventBridge', () => ({
  useGrafanaEventBridge: (...args: unknown[]) => mockUseGrafanaEventBridge(...args),
}));

jest.mock('../hooks/useFitBounds', () => ({
  useFitBounds: (...args: unknown[]) => mockUseFitBounds(...args),
}));

jest.mock('../hooks/usePanelLayers', () => ({
  usePanelFeatures: (...args: unknown[]) => mockUsePanelFeatures(...args),
  usePanelLayers: (...args: unknown[]) => {
    latestFeatureClick = args[7] as (feature: Feature, info: any) => void;
    return mockUsePanelLayers(...args);
  },
  useGeoJsonUrlFeatures: () => new Map(),
}));

jest.mock('./map/DeckGLMap', () => ({
  DeckGLMap: (props: any) => {
    latestMapProps = props;
    return <div data-testid="deckgl-map" />;
  },
}));

jest.mock('./map-legend/MapLegend', () => ({
  MapLegend: ({ layers, onToggleVisibility }: { layers: Array<{ id: string }>; onToggleVisibility?: (layerId: string) => void }) => (
    <button type="button" onClick={() => onToggleVisibility?.(layers[0].id)}>
      toggle-layer
    </button>
  ),
}));

jest.mock('./SensorPopup', () => ({
  SensorPopup: ({ selectedKey, onClose }: { selectedKey: string; template: string; onClose: () => void }) => (
    <div>
      <span>{selectedKey}</span>
      <button type="button" onClick={onClose}>
        close-popup
      </button>
    </div>
  ),
  DEFAULT_POPUP_TEMPLATE: '',
}));

jest.mock('./controls/TimePlaybackControls', () => ({
  TimePlaybackControls: () => <div data-testid="time-playback-controls" />,
}));

function createOptions(overrides: { sync?: Partial<MapPanelOptions['sync']> } = {}): MapPanelOptions {
  return {
    basemap: { provider: 'maplibre', maplibre: { mapStyle: 'carto-dark' }, google: {} },
    deck: { parameters: {}, lighting: {}, interleaved: true },
    initialView: { mode: 'manual', state: { latitude: 40.7, longitude: -73.9, zoom: 11 }, fitData: { source: 'allLayers', padding: 48, maxZoom: 22 } },
    layers: [
      {
        id: 'layer-1',
        type: 'scatterplot',
        label: 'Layer 1',
        visible: true,
        settings: {
          radiusMinPixels: 4,
          radiusMaxPixels: 20,
          radiusField: '',
          radiusScale: 1,
          elevationField: '',
          elevationScale: 1,
          depthTest: false,
          stroked: true,
          showLabels: false,
          labelField: '',
        },
        geometry: { type: 'none' },
        timeFilter: { mode: 'none', timeField: '' },
            opacity: 1,
        selectionKeyField: 'deployment_id',
      },
    ],
    time: { show: false, defaultSpeed: 1, loop: false },
    legend: { show: true },
    tooltip: { show: true },
    popup: { show: true },
    sync: { publish: true, subscribe: true, ...overrides.sync },
  };
}

function createProps(options = createOptions()): PanelProps<MapPanelOptions> {
  return {
    id: 1,
    data: {
      series: [],
      state: 'Done',
      timeRange: {
        from: { valueOf: () => 1000 },
        to: { valueOf: () => 2000 },
        raw: { from: 'now-15m', to: 'now' },
      } as any,
    } as any,
    timeZone: 'utc',
    timeRange: {} as any,
    options,
    fieldConfig: {} as any,
    transparent: false,
    width: 800,
    height: 600,
    renderCounter: 0,
    replaceVariables: (value: string) => value,
    onOptionsChange: jest.fn(),
    onFieldConfigChange: jest.fn(),
    onChangeTimeRange: jest.fn(),
    eventBus: {} as EventBus,
    title: 'Map Panel',
  };
}

describe('MapPanel', () => {
  const playback = {
    cursorTimeMs: 1500,
    cursorTimeMsRef: { current: 1500 },
    getCursorTimeMs: jest.fn(() => 1500),
    playing: false,
    scrubbing: false,
    followLive: false,
    playbackSpeed: 1,
    speeds: [1],
    setCursorState: jest.fn(),
    play: jest.fn(),
    pause: jest.fn(),
    scrubTo: jest.fn(),
    seekTo: jest.fn(),
    setSpeed: jest.fn(),
  };

  let selectedKey: string | null;
  let setSelectedKey: jest.Mock;

  beforeEach(() => {
    selectedKey = null;
    setSelectedKey = jest.fn((key: string | null) => {
      selectedKey = key;
    });
    latestFeatureClick = undefined;
    latestMapProps = undefined;

    mockUsePlayback.mockReturnValue(playback);
    mockUseGrafanaEventBridge.mockImplementation(() => ({ selectedKey, setSelectedKey }));
    mockUsePanelFeatures.mockReturnValue(new Map());
    mockUseFitBounds.mockReturnValue(undefined);
    mockUsePanelLayers.mockReturnValue({ layers: [], getTooltip: null, preparedLayerStates: [] });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('toggles a layer visibility through onOptionsChange', () => {
    const props = createProps();
    render(<MapPanel {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'toggle-layer' }));

    expect(props.onOptionsChange).toHaveBeenCalledWith({
      ...props.options,
      layers: [
        {
          ...props.options.layers[0],
          visible: false,
        },
      ],
    });
  });

  it('passes fitRequestId from options down to the map', () => {
    const options = {
      ...createOptions(),
      initialView: { ...createOptions().initialView, mode: 'fitData' as const, fitRequestId: 3 },
    };
    render(<MapPanel {...createProps(options)} />);
    expect(latestMapProps.fitRequestId).toBe(3);
  });

  it('does not call onOptionsChange when the viewport changes', () => {
    const props = createProps();
    render(<MapPanel {...props} />);
    act(() => {
      latestMapProps.onViewportChange({ latitude: 40, longitude: -74, zoom: 12, bearing: 0, pitch: 0 });
    });
    expect(props.onOptionsChange).not.toHaveBeenCalled();
  });

  it('shows a popup when a feature is clicked and clears it on close', () => {
    const props = createProps();
    const feature: Feature = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: { deployment_id: 'sensor-1', depth_inches: 3.2 },
    };

    const view = render(<MapPanel {...props} />);
    expect(latestFeatureClick).toBeDefined();

    act(() => {
      latestFeatureClick?.(feature, { layer: { props: { config: { selectionKeyField: 'deployment_id' } } } });
    });
    view.rerender(<MapPanel {...props} />);

    expect(setSelectedKey).toHaveBeenLastCalledWith('sensor-1');
    expect(screen.getByText('sensor-1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'close-popup' }));
    view.rerender(<MapPanel {...props} />);

    expect(setSelectedKey).toHaveBeenLastCalledWith(null);
    expect(screen.queryByText('sensor-1')).not.toBeInTheDocument();
  });

  it('toggles off the selected feature when it is clicked again', () => {
    selectedKey = 'sensor-1';
    const props = createProps();
    const feature: Feature = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: { deployment_id: 'sensor-1' },
    };

    render(<MapPanel {...props} />);
    expect(latestFeatureClick).toBeDefined();

    latestFeatureClick?.(feature, { layer: { props: { config: { selectionKeyField: 'deployment_id' } } } });

    expect(setSelectedKey).toHaveBeenCalledWith(null);
  });

  it('does not reuse stale popup feature details for an external selection change', () => {
    const props = createProps();
    const feature: Feature = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: { deployment_id: 'sensor-1', depth_inches: 3.2 },
    };

    const view = render(<MapPanel {...props} />);

    act(() => {
      latestFeatureClick?.(feature, { layer: { props: { config: { selectionKeyField: 'deployment_id' } } } });
    });
    view.rerender(<MapPanel {...props} />);
    expect(screen.getByText('sensor-1')).toBeInTheDocument();

    selectedKey = 'sensor-2';
    view.rerender(<MapPanel {...props} />);

    expect(screen.getByText('sensor-2')).toBeInTheDocument();
    expect(screen.queryByText('sensor-1')).not.toBeInTheDocument();
  });

  it('stores selection changes in the configured dashboard variable', () => {
    const props = createProps(createOptions({ sync: { selectionVariableName: 'selected_sensor' } }));
    const feature: Feature = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: { deployment_id: 'sensor-1' },
    };

    const view = render(<MapPanel {...props} />);
    expect(mockUseGrafanaEventBridge).toHaveBeenCalledWith(
      expect.objectContaining({ selectionVariableName: 'selected_sensor' })
    );

    act(() => {
      latestFeatureClick?.(feature, { layer: { props: { config: { selectionKeyField: 'deployment_id' } } } });
    });
    view.rerender(<MapPanel {...props} />);

    expect(setSelectedKey).toHaveBeenLastCalledWith('sensor-1');

    fireEvent.click(screen.getByRole('button', { name: 'close-popup' }));
    view.rerender(<MapPanel {...props} />);

    expect(setSelectedKey).toHaveBeenLastCalledWith(null);
  });
});
