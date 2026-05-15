import { 
  CompassWidget, 
  _ScaleWidget as ScaleWidget, 
  _GeocoderWidget as GeocoderWidget,
  type CompassWidgetProps,
  type ScaleWidgetProps,
  type GeocoderWidgetProps,
} from '@deck.gl/widgets';
import { PLACEMENTS, type BaseWidgetConfig, type WidgetDefinition } from './types';

type CompassWidgetConfig = BaseWidgetConfig<'compass', Omit<CompassWidgetProps, 'id'>>;
type ScaleWidgetConfig = BaseWidgetConfig<'scale', Omit<ScaleWidgetProps, 'id'>>;
type GeocoderWidgetConfig = BaseWidgetConfig<'geocoder', Omit<GeocoderWidgetProps, 'id'>>;

// TODO: pass in callbacks
export const compassWidgetDefinition: WidgetDefinition<CompassWidgetConfig> = {
  type: 'compass',
  label: 'Compass',
  description: 'Add a compass control that can reset map bearing.',
  createDefaultConfig: (i) => ({
    id: `widget-compass-${i + 1}`,
    type: 'compass',
    label: `Compass ${i + 1}`,
    visible: true,
    settings: { placement: 'top-left' },
  }),
  editorSections: [
    {
      title: 'Compass',
      fields: [
        { key: 'placement', label: 'Placement', type: 'select', selectOptions: PLACEMENTS, defaultValue: 'top-left' },
        { key: 'label', label: 'Tooltip', type: 'string', defaultValue: 'Reset bearing' },
        { key: 'transitionDuration', label: 'Transition (ms)', type: 'number', defaultValue: 200 },
      ],
    },
  ],
  createWidget: (config) => new CompassWidget({ id: config.id, ...config.settings }),
};

// TODO: pass in callbacks
export const scaleWidgetDefinition: WidgetDefinition<ScaleWidgetConfig> = {
  type: 'scale',
  label: 'Scale',
  description: 'Show a map scale indicator for distance reference.',
  createDefaultConfig: (i) => ({
    id: `widget-scale-${i + 1}`,
    type: 'scale',
    label: `Scale ${i + 1}`,
    visible: true,
    settings: { placement: 'bottom-left' },
  }),
  editorSections: [
    {
      title: 'Scale',
      fields: [
        { key: 'placement', label: 'Placement', type: 'select', selectOptions: PLACEMENTS, defaultValue: 'bottom-left' },
        { key: 'label', label: 'Label', type: 'string', defaultValue: '' },
      ],
    },
  ],
  createWidget: (config) => new ScaleWidget({ id: config.id, ...config.settings }),
};

// TODO: pass in callbacks
export const geocoderWidgetDefinition: WidgetDefinition<GeocoderWidgetConfig> = {
  type: 'geocoder',
  label: 'Geocoder',
  description: 'Add a search box to find and jump to locations.',
  createDefaultConfig: (i) => ({
    id: `widget-geocoder-${i + 1}`,
    type: 'geocoder',
    label: `Geocoder ${i + 1}`,
    visible: true,
    settings: { placement: 'top-left', geocoder: 'coordinates', transitionDuration: 1000 },
  }),
  editorSections: [
    {
      title: 'Geocoder',
      fields: [
        { key: 'placement', label: 'Placement', type: 'select', selectOptions: PLACEMENTS, defaultValue: 'top-left' },
        { key: 'label', label: 'Tooltip', type: 'string', defaultValue: 'Search location' },
        {
          key: 'geocoder',
          label: 'Geocoder',
          type: 'select',
          defaultValue: 'coordinates',
          selectOptions: [
            { label: 'Coordinates', value: 'coordinates' },
            { label: 'Mapbox', value: 'mapbox' },
            { label: 'Google', value: 'google' },
            { label: 'OpenCage', value: 'opencage' },
          ],
        },
        { key: 'apiKey', label: 'API Key', type: 'string', defaultValue: '' },
        { key: 'transitionDuration', label: 'Transition (ms)', type: 'number', defaultValue: 1000 },
      ],
    },
  ],
  createWidget: (config) => new GeocoderWidget({ id: config.id, ...config.settings }),
};
