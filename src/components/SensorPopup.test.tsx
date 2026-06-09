import React from 'react';
import { render, screen } from '@testing-library/react';
import { SensorPopup } from './SensorPopup';
import type { PopupSelectionContext } from '../utils/popupSelection';

function createSelectionContext(): PopupSelectionContext {
  return {
    selectedKey: 'sensor-1',
    primary: {
      layerId: 'A',
      layerLabel: 'Layer A',
      rowIndex: 0,
      feature: null,
      properties: { name: 'Sensor 1', depth_inches: 4 },
      scope: { name: 'Sensor 1', depth_inches: 4, this: { name: 'Sensor 1', depth_inches: 4 } },
      name: 'Sensor 1',
      depth_inches: 4,
    },
    match: {
      A: {
        layerId: 'A',
        layerLabel: 'Layer A',
        rowIndex: 0,
        feature: null,
        properties: { name: 'Sensor 1', depth_inches: 4 },
        scope: { name: 'Sensor 1', depth_inches: 4 },
        name: 'Sensor 1',
        depth_inches: 4,
      },
      B: {
        layerId: 'B',
        layerLabel: 'Layer B',
        rowIndex: 0,
        feature: null,
        properties: { depth_inches: 4 },
        scope: { depth_inches: 4 },
        depth_inches: 4,
      },
    },
    matches: {
      A: [
        {
          layerId: 'A',
          layerLabel: 'Layer A',
          rowIndex: 0,
          feature: null,
          properties: { name: 'Sensor 1', depth_inches: 4 },
          scope: { name: 'Sensor 1', depth_inches: 4 },
          name: 'Sensor 1',
          depth_inches: 4,
        },
      ],
      B: [
        {
          layerId: 'B',
          layerLabel: 'Layer B',
          rowIndex: 0,
          feature: null,
          properties: { time: '2025-01-01T00:00:00Z', depth_inches: 4 },
          scope: { time: '2025-01-01T00:00:00Z', depth_inches: 4 },
          time: '2025-01-01T00:00:00Z',
          depth_inches: 4,
        },
        {
          layerId: 'B',
          layerLabel: 'Layer B',
          rowIndex: 1,
          feature: null,
          properties: { time: '2025-01-01T00:05:00Z', depth_inches: 7 },
          scope: { time: '2025-01-01T00:05:00Z', depth_inches: 7 },
          time: '2025-01-01T00:05:00Z',
          depth_inches: 7,
        },
      ],
    },
    flatMatches: [],
  };
}

describe('SensorPopup', () => {
  it('preserves the default primary-properties rendering', () => {
    render(
      <SensorPopup
        selectedKey="sensor-1"
        selectionContext={createSelectionContext()}
        template={'{{ name }} {{ depth_inches }}'}
        onClose={() => {}}
        inline
      />
    );

    expect(screen.getByText('Sensor 1 4')).toBeInTheDocument();
  });

  it('renders per-layer match and matches collections in the template', () => {
    render(
      <SensorPopup
        selectedKey="sensor-1"
        selectionContext={createSelectionContext()}
        template={'{{ match.A.name }} {% for row in matches.B %}{{ row.time }}={{ row.depth_inches }} {% endfor %}'}
        onClose={() => {}}
        inline
      />
    );

    expect(screen.getByText(/Sensor 1/)).toBeInTheDocument();
    expect(screen.getByText(/2025-01-01T00:00:00Z=4/)).toBeInTheDocument();
    expect(screen.getByText(/2025-01-01T00:05:00Z=7/)).toBeInTheDocument();
  });
});
