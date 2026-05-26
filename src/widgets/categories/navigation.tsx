import {
  ZoomWidget,
  ResetViewWidget,
  GimbalWidget,
  ScrollbarWidget,
  type ZoomWidgetProps,
  type ResetViewWidgetProps,
  type GimbalWidgetProps,
  type ScrollbarWidgetProps,
} from '@deck.gl/widgets';
import { PLACEMENTS, type BaseWidgetConfig, type WidgetCallbacks, type WidgetDefinition } from '../types';

type ZoomWidgetConfig = BaseWidgetConfig<'zoom', Omit<ZoomWidgetProps, 'id'>>;
type ResetViewWidgetConfig = BaseWidgetConfig<'reset-view', Omit<ResetViewWidgetProps, 'id'>>;
type GimbalWidgetConfig = BaseWidgetConfig<'gimbal', Omit<GimbalWidgetProps, 'id'>>;
type ScrollbarWidgetConfig = BaseWidgetConfig<'scrollbar', Omit<ScrollbarWidgetProps, 'id'>>;

const ORIENTATIONS = [
  { label: 'Vertical', value: 'vertical' },
  { label: 'Horizontal', value: 'horizontal' },
];

export const zoomWidgetDefinition: WidgetDefinition<ZoomWidgetConfig> = {
  type: 'zoom',
  label: 'Zoom',
  description: 'Add zoom in and zoom out controls.',
  nativeControlProviders: ['google', 'maplibre'],
  createDefaultConfig: (i) => ({
    id: `widget-zoom-${i + 1}`,
    type: 'zoom',
    label: `Zoom ${i + 1}`,
    visible: true,
    settings: { placement: 'top-left' },
  }),
  editorSections: [
    {
      fields: [
        { key: 'placement', label: 'Placement', type: 'select', selectOptions: PLACEMENTS, defaultValue: 'top-left' },
        {
          key: 'orientation',
          label: 'Orientation',
          type: 'select',
          selectOptions: ORIENTATIONS,
          defaultValue: 'vertical',
        },
        { key: 'transitionDuration', label: 'Transition (ms)', type: 'number', defaultValue: 200 },
        // { key: 'zoomInLabel', label: 'Zoom in tooltip', type: 'string', defaultValue: 'Zoom in' },
        // { key: 'zoomOutLabel', label: 'Zoom out tooltip', type: 'string', defaultValue: 'Zoom out' },
      ],
    },
  ],
  createWidget: (config, callbacks?: WidgetCallbacks) =>
    new ZoomWidget({
      id: config.id,
      ...config.settings,
      onZoom: callbacks?.onViewStateChange
        ? ({
            viewId,
            delta,
            zoom,
            zoomX,
            zoomY,
          }: {
            viewId: string;
            delta: number;
            zoom: number;
            zoomX?: number;
            zoomY?: number;
          }) =>
            callbacks.onViewStateChange!({
              viewId,
              delta,
              zoom,
              zoomX,
              zoomY,
              transitionDuration: config.settings.transitionDuration,
            })
        : undefined,
    }),
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
      fields: [
        { key: 'placement', label: 'Placement', type: 'select', selectOptions: PLACEMENTS, defaultValue: 'top-left' },
        // { key: 'label', label: 'Tooltip', type: 'string', defaultValue: 'Reset view' },
      ],
    },
  ],
  createWidget: (config, callbacks?: WidgetCallbacks) =>
    new ResetViewWidget({
      id: config.id,
      ...config.settings,
      initialViewState: callbacks?.resetViewState,
      onReset: callbacks?.onViewStateChange
        ? ({ viewState }: { viewState: object }) => callbacks.onViewStateChange!(callbacks.resetViewState!)
        : undefined,
    }),
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
      fields: [
        { key: 'placement', label: 'Placement', type: 'select', selectOptions: PLACEMENTS, defaultValue: 'top-left' },
        // { key: 'label', label: 'Tooltip', type: 'string', defaultValue: 'Reset bearing' },
        { key: 'strokeWidth', label: 'Stroke width', type: 'number', defaultValue: 2 },
        { key: 'transitionDuration', label: 'Transition (ms)', type: 'number', defaultValue: 200 },
      ],
    },
  ],
  createWidget: (config, callbacks?: WidgetCallbacks) =>
    new GimbalWidget({
      id: config.id,
      ...config.settings,
      onReset: callbacks?.onViewStateChange
        ? ({ rotationOrbit, rotationX }: { rotationOrbit: number; rotationX: number }) =>
            callbacks.onViewStateChange!({
              rotationOrbit,
              rotationX,
              transitionDuration: config.settings.transitionDuration,
            })
        : undefined,
    }),
};

// DISABLE
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
      fields: [
        {
          key: 'placement',
          label: 'Placement',
          type: 'select',
          selectOptions: PLACEMENTS,
          defaultValue: 'bottom-left',
        },
        {
          key: 'orientation',
          label: 'Orientation',
          type: 'select',
          selectOptions: ORIENTATIONS,
          defaultValue: 'horizontal',
        },
        { key: 'captureWheel', label: 'Capture wheel', type: 'boolean', defaultValue: false },
      ],
    },
  ],
  createWidget: (config) => new ScrollbarWidget({ id: config.id, ...config.settings }),
};
