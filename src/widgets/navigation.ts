import { ZoomWidget, ResetViewWidget, GimbalWidget, ScrollbarWidget } from '@deck.gl/widgets';
import {
  PLACEMENTS,
  type ZoomWidgetConfig,
  type ResetViewWidgetConfig,
  type GimbalWidgetConfig,
  type ScrollbarWidgetConfig,
  type WidgetDefinition,
} from './types';

const ORIENTATIONS = [
  { label: 'Vertical', value: 'vertical' },
  { label: 'Horizontal', value: 'horizontal' },
];

export const zoomWidgetDefinition: WidgetDefinition<ZoomWidgetConfig> = {
  type: 'zoom',
  label: 'Zoom',
  description: 'Add zoom in and zoom out controls.',
  createDefaultConfig: (i) => ({
    id: `widget-zoom-${i + 1}`,
    type: 'zoom',
    label: `Zoom ${i + 1}`,
    visible: true,
    settings: { placement: 'top-left' },
  }),
  editorSections: [
    {
      title: 'Zoom',
      fields: [
        { key: 'placement', label: 'Placement', type: 'select', selectOptions: PLACEMENTS, defaultValue: 'top-left' },
        { key: 'orientation', label: 'Orientation', type: 'select', selectOptions: ORIENTATIONS, defaultValue: 'vertical' },
        { key: 'transitionDuration', label: 'Transition (ms)', type: 'number', defaultValue: 200 },
        { key: 'zoomInLabel', label: 'Zoom in tooltip', type: 'string', defaultValue: 'Zoom in' },
        { key: 'zoomOutLabel', label: 'Zoom out tooltip', type: 'string', defaultValue: 'Zoom out' },
      ],
    },
  ],
  createWidget: (config) => new ZoomWidget({ id: config.id, ...config.settings }),
};

export const resetViewWidgetDefinition: WidgetDefinition<ResetViewWidgetConfig> = {
  type: 'reset-view',
  label: 'Reset View',
  description: 'Add a button to return the map to its default view.',
  createDefaultConfig: (i) => ({
    id: `widget-reset-view-${i + 1}`,
    type: 'reset-view',
    label: `Reset View ${i + 1}`,
    visible: true,
    settings: { placement: 'top-left', label: 'Reset view' },
  }),
  editorSections: [
    {
      title: 'Reset View',
      fields: [
        { key: 'placement', label: 'Placement', type: 'select', selectOptions: PLACEMENTS, defaultValue: 'top-left' },
        { key: 'label', label: 'Tooltip', type: 'string', defaultValue: 'Reset view' },
      ],
    },
  ],
  createWidget: (config) => new ResetViewWidget({ id: config.id, ...config.settings, onReset: console.log }),
};

export const gimbalWidgetDefinition: WidgetDefinition<GimbalWidgetConfig> = {
  type: 'gimbal',
  label: 'Gimbal',
  description: 'Add a control to reset map bearing and orientation.',
  createDefaultConfig: (i) => ({
    id: `widget-gimbal-${i + 1}`,
    type: 'gimbal',
    label: `Gimbal ${i + 1}`,
    visible: true,
    settings: { placement: 'top-left' },
  }),
  editorSections: [
    {
      title: 'Gimbal',
      fields: [
        { key: 'placement', label: 'Placement', type: 'select', selectOptions: PLACEMENTS, defaultValue: 'top-left' },
        { key: 'label', label: 'Tooltip', type: 'string', defaultValue: 'Reset bearing' },
        { key: 'strokeWidth', label: 'Stroke width', type: 'number', defaultValue: 2 },
        { key: 'transitionDuration', label: 'Transition (ms)', type: 'number', defaultValue: 200 },
      ],
    },
  ],
  createWidget: (config) => new GimbalWidget({ id: config.id, ...config.settings }),
};

export const scrollbarWidgetDefinition: WidgetDefinition<ScrollbarWidgetConfig> = {
  type: 'scrollbar',
  label: 'Scrollbar',
  description: 'Add a draggable scrollbar for ranged navigation.',
  createDefaultConfig: (i) => ({
    id: `widget-scrollbar-${i + 1}`,
    type: 'scrollbar',
    label: `Scrollbar ${i + 1}`,
    visible: true,
    settings: { placement: 'bottom-left', orientation: 'horizontal' },
  }),
  editorSections: [
    {
      title: 'Scrollbar',
      fields: [
        { key: 'placement', label: 'Placement', type: 'select', selectOptions: PLACEMENTS, defaultValue: 'bottom-left' },
        { key: 'orientation', label: 'Orientation', type: 'select', selectOptions: ORIENTATIONS, defaultValue: 'horizontal' },
        { key: 'captureWheel', label: 'Capture wheel', type: 'boolean', defaultValue: false },
      ],
    },
  ],
  createWidget: (config) => new ScrollbarWidget({ id: config.id, ...config.settings }),
};
