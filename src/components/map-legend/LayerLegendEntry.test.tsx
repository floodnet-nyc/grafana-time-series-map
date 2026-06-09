import React from 'react';
import { render, screen } from '@testing-library/react';
import type { LayerConfig } from '../../layers';
import type { IconLayerConfig } from '../../layers/icon';
import { createSourceRef } from '../../layers/defaults';
import { LayerLegendEntry } from './LayerLegendEntry';

jest.mock('./scales/GradientLegend', () => ({
  GradientLegend: () => null,
}));

jest.mock('./scales/ThresholdLegend', () => ({
  ThresholdLegend: () => null,
}));

function createIconLayer(overrides: Partial<LayerConfig> = {}): LayerConfig {
  const base: IconLayerConfig = {
    id: 'tidal-stations',
    type: 'icon',
    label: 'Tidal Stations',
    visible: true,
    settings: {
      fixedIcon: 'marker',
      icon: createSourceRef(),
      iconAtlasUrl: '',
      iconMappingUrl: '',
      fixedRotation: 0,
      rotation: createSourceRef(),
      elevation: createSourceRef(),
      elevationScale: 1,
      depthTest: false,
      sizeScale: 16,
      sizeMinPixels: 8,
      sizeMaxPixels: 64,
      size: createSourceRef(),
      billboard: true,
      alphaCutoff: 0.05,
    },
    geometry: { type: 'none' },
    timeFilter: { mode: 'none', time: createSourceRef() },
    opacity: 1,
    data: { featureSource: { id: 'main', refId: '' } },
    colorScale: { type: 'fixed', fixedColor: [31, 96, 196, 255] },
    extensions: [],
  };

  return { ...base, ...overrides } as LayerConfig;
}

describe('LayerLegendEntry', () => {
  it('renders a representative icon swatch for icon layers', () => {
    render(<LayerLegendEntry layer={createIconLayer()} showEye={false} />);

    expect(screen.getByLabelText('Tidal Stations legend icon')).toBeInTheDocument();
  });
});
