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
}));

jest.mock('./map/DeckGLMap', () => ({
  DeckGLMap: () => <div data-testid="deckgl-map" />,
}));

jest.mock('./MapLegend', () => ({
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

function createOptions(overrides: Partial<MapPanelOptions> = {}): MapPanelOptions {
  return {
    basemapProvider: 'maplibre',
    maplibreStyle: 'carto-dark',
    initialViewMode: 'manual',
    initialLatitude: 40.7,
    initialLongitude: -73.9,
    initialZoom: 11,
    initialBearing: 0,
    initialPitch: 0,
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
          stroked: true,
          showLabels: false,
          labelField: '',
        },
        geometry: { type: 'none' },
        timeFilter: { mode: 'none', timeField: '' },
        fieldMappings: [],
        opacity: 1,
        selectionKeyField: 'deployment_id',
      },
    ],
    defaultPlaybackSpeed: 1,
    loopPlayback: false,
    showTimeControls: false,
    showLegend: true,
    interleaved: true,
    syncPublish: true,
    syncSubscribe: true,
    ...overrides,
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
    playing: false,
    scrubbing: false,
    playbackSpeed: 1,
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

    mockUsePlayback.mockReturnValue(playback);
    mockUseGrafanaEventBridge.mockImplementation(() => ({ selectedKey, setSelectedKey }));
    mockUsePanelFeatures.mockReturnValue(new Map());
    mockUseFitBounds.mockReturnValue(undefined);
    mockUsePanelLayers.mockReturnValue({ layers: [], getTooltip: null });
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
    const props = createProps(createOptions({ selectionVariableName: 'selected_sensor' }));
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
