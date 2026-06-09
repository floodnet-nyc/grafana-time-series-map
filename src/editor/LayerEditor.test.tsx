import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LayerEditor } from './LayerEditor';
import type { LayerConfig } from '../layers';
import { createSourceRef } from '../layers/defaults';
import type { ScatterplotLayerConfig } from '../layers/scatterplot';

function createLayer(overrides: Partial<LayerConfig> = {}): LayerConfig {
  const base: ScatterplotLayerConfig = {
    id: 'layer-1',
    type: 'scatterplot',
    label: 'Layer 1',
    visible: true,
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
      labelCollisionPriorityScale: 1,
      labelCollisionTestScale: 1.2,
      labelElevationOffset: 6,
    },
    geometry: { type: 'none' },
    timeFilter: { mode: 'none', time: createSourceRef() },
    opacity: 1,
    data: { featureSource: { id: 'main', refId: '' } },
    extensions: [],
  };

  return { ...base, ...overrides } as LayerConfig;
}

describe('LayerEditor', () => {
  it('allows editing the layer id', () => {
    const layer = createLayer();
    const onChange = jest.fn();

    render(<LayerEditor layer={layer} onChange={onChange} />);

    fireEvent.change(screen.getByDisplayValue('layer-1'), { target: { value: 'flood-depth' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'flood-depth',
        label: 'Layer 1',
      })
    );
  });
});
