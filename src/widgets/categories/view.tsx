import React from 'react';
import { 
  FullscreenWidget, 
  _SplitterWidget as SplitterWidget,
  type FullscreenWidgetProps,
  type SplitterWidgetProps,
} from '@deck.gl/widgets';
import { MapView } from '@deck.gl/core';
import { FullscreenControl } from 'react-map-gl/maplibre';
import { getControlPosition, mapControlToGooglePosition } from 'components/map/google/controlMappings';
import { PLACEMENTS, type BaseWidgetConfig, type WidgetDefinition } from '../types';

type FullscreenWidgetConfig = BaseWidgetConfig<'fullscreen', Omit<FullscreenWidgetProps, 'id'>>;
type SplitterWidgetConfig = BaseWidgetConfig<'splitter', Omit<SplitterWidgetProps, 'id'>>;

// works
export const fullscreenWidgetDefinition: WidgetDefinition<FullscreenWidgetConfig> = {
  type: 'fullscreen',
  label: 'Fullscreen',
  description: 'Add a control to toggle the map into fullscreen mode.',
  createDefaultConfig: (i) => ({
    id: `widget-fullscreen-${i + 1}`,
    type: 'fullscreen',
    label: `Fullscreen ${i + 1}`,
    visible: true,
    settings: { placement: 'top-right' },
  }),
  editorSections: [
    {
      fields: [
        { key: 'placement', label: 'Placement', type: 'select', selectOptions: PLACEMENTS, defaultValue: 'top-right' },
        { key: 'enterLabel', label: 'Enter label', type: 'string', defaultValue: 'Enter fullscreen' },
        { key: 'exitLabel', label: 'Exit label', type: 'string', defaultValue: 'Exit fullscreen' },
      ],
    },
  ],
  createWidget: (config) => new FullscreenWidget({ id: config.id, ...config.settings }),
  nativeControls: {
    google: (config) => {
      const pos = config.settings.placement === 'fill' ? 'top-right' : config.settings.placement;
      return {
        fullscreenControl: true,
        fullscreenControlOptions: {
          position: getControlPosition(mapControlToGooglePosition(pos ?? 'top-right'), 'TOP_RIGHT'),
        },
      };
    },
    maplibre: (config) => (
      <FullscreenControl
        key="widget-fullscreen-native"
        position={(config.settings.placement === 'fill' ? 'top-right' : config.settings.placement) ?? 'top-right'}
      />
    ),
  },
};

// DISABLE
export const splitterWidgetDefinition: WidgetDefinition<SplitterWidgetConfig> = {
  type: 'splitter',
  label: 'Splitter',
  description: 'Split the map view into two synchronized panes.',
  createDefaultConfig: (i) => ({
    id: `widget-splitter-${i + 1}`,
    type: 'splitter',
    label: `Splitter ${i + 1}`,
    visible: true,
    settings: {
      viewLayout: {
        orientation: 'horizontal',
        views: [new MapView({ id: 'left' }), new MapView({ id: 'right' })],
      },
    },
  }),
  editorSections: [
    {
      fields: [
        {
          key: 'viewLayout.orientation',
          label: 'Orientation',
          type: 'select',
          selectOptions: [{ label: 'Horizontal', value: 'horizontal' }, { label: 'Vertical', value: 'vertical' }],
          defaultValue: 'horizontal',
        },
      ],
    },
  ],
  createWidget: (config) => new SplitterWidget({ id: config.id, ...config.settings }),
};
