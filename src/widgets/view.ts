import { FullscreenWidget, _SplitterWidget as SplitterWidget } from '@deck.gl/widgets';
import { MapView } from '@deck.gl/core';
import { PLACEMENTS, type FullscreenWidgetConfig, type SplitterWidgetConfig, type WidgetDefinition } from './types';

export const fullscreenWidgetDefinition: WidgetDefinition<FullscreenWidgetConfig> = {
  type: 'fullscreen',
  label: 'Fullscreen',
  createDefaultConfig: (i) => ({
    id: `widget-fullscreen-${i + 1}`,
    type: 'fullscreen',
    label: `Fullscreen ${i + 1}`,
    visible: true,
    settings: { placement: 'top-right' },
  }),
  editorSections: [
    {
      title: 'Fullscreen',
      fields: [
        { key: 'placement', label: 'Placement', type: 'select', selectOptions: PLACEMENTS, defaultValue: 'top-right' },
        { key: 'enterLabel', label: 'Enter label', type: 'string', defaultValue: 'Enter fullscreen' },
        { key: 'exitLabel', label: 'Exit label', type: 'string', defaultValue: 'Exit fullscreen' },
      ],
    },
  ],
  createWidget: (config) => new FullscreenWidget({ id: config.id, ...config.settings }),
};

export const splitterWidgetDefinition: WidgetDefinition<SplitterWidgetConfig> = {
  type: 'splitter',
  label: 'Splitter',
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
      title: 'Splitter',
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
