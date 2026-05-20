import React from 'react';
import {
  CompassWidget,
  _ScaleWidget as ScaleWidget,
  _GeocoderWidget as GeocoderWidget,
  type CompassWidgetProps,
  type ScaleWidgetProps,
  type GeocoderWidgetProps,
} from '@deck.gl/widgets';
import { NavigationControl, ScaleControl } from 'react-map-gl/maplibre';
import { getCameraControlPosition, getControlPosition } from 'components/map/google/controlMappings';
import { PLACEMENTS, type BaseWidgetConfig, type WidgetCallbacks, type WidgetDefinition } from '../types';
import { GeolocateWidget, type GeolocateWidgetProps } from '../custom/geolocate-widget';

type CompassWidgetConfig = BaseWidgetConfig<'compass', Omit<CompassWidgetProps, 'id'>>;
type GeolocateWidgetConfig = BaseWidgetConfig<'geolocate', Omit<GeolocateWidgetProps, 'id' | 'onGeolocate' | 'onError'>>;
type ScaleWidgetConfig = BaseWidgetConfig<'scale', Omit<ScaleWidgetProps, 'id'>>;
type GeocoderWidgetConfig = BaseWidgetConfig<'geocoder', Omit<GeocoderWidgetProps, 'id'>>;

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
      fields: [
        { key: 'placement', label: 'Placement', type: 'select', selectOptions: PLACEMENTS, defaultValue: 'top-left' },
        // { key: 'label', label: 'Tooltip', type: 'string', defaultValue: 'Reset bearing' },
        { key: 'transitionDuration', label: 'Transition (ms)', type: 'number', defaultValue: 200 },
      ],
    },
  ],
  createWidget: (config, callbacks?: WidgetCallbacks) =>
    new CompassWidget({
      id: config.id,
      ...config.settings,
      onReset: callbacks?.onViewStateChange
        ? ({ bearing, pitch }: { bearing: number; pitch: number }) =>
            callbacks.onViewStateChange!({
              bearing,
              pitch,
              transitionDuration: config.settings.transitionDuration,
            })
        : undefined,
    }),
  nativeControls: {
    google: (config) => {
      const pos = config.settings.placement === 'fill' ? 'top-left' : config.settings.placement;
      return {
        rotateControl: true,
        rotateControlOptions: {
          position: getControlPosition(getCameraControlPosition(pos ?? 'top-left'), 'INLINE_START_BLOCK_END'),
        },
      };
    },
    maplibre: (config) => (
      <NavigationControl
        key="widget-compass-native"
        position={(config.settings.placement === 'fill' ? 'top-left' : config.settings.placement) ?? 'top-left'}
        showZoom={false}
        showCompass={true}
        visualizePitch={true}
      />
    ),
  },
};

// TODO: theme not working
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
      fields: [
        { key: 'placement', label: 'Placement', type: 'select', selectOptions: PLACEMENTS, defaultValue: 'bottom-left' },
        { key: 'label', label: 'Label', type: 'string', defaultValue: '' },
      ],
    },
  ],
  createWidget: (config) => new ScaleWidget({ id: config.id, ...config.settings }),
  nativeControls: {
    google: () => ({ scaleControl: true }),
    maplibre: () => <ScaleControl key="widget-scale-native" position="bottom-left" />,
  },
};

export const geolocateWidgetDefinition: WidgetDefinition<GeolocateWidgetConfig> = {
  type: 'geolocate',
  label: 'Geolocate',
  description: 'Locate the current user and move the map camera to that position.',
  createDefaultConfig: (i) => ({
    id: `widget-geolocate-${i + 1}`,
    type: 'geolocate',
    label: `Geolocate ${i + 1}`,
    visible: true,
    settings: {
      placement: 'top-right',
      label: 'Find my location',
      zoom: 14,
      transitionDuration: 800,
      enableHighAccuracy: true,
    },
  }),
  editorSections: [
    {
      fields: [
        { key: 'placement', label: 'Placement', type: 'select', selectOptions: PLACEMENTS, defaultValue: 'top-right' },
        // { key: 'label', label: 'Tooltip', type: 'string', defaultValue: 'Find my location' },
        { key: 'zoom', label: 'Target zoom', type: 'number', defaultValue: 14 },
        { key: 'transitionDuration', label: 'Transition (ms)', type: 'number', defaultValue: 800 },
        { key: 'enableHighAccuracy', label: 'High accuracy', type: 'boolean', defaultValue: true },
      ],
    },
  ],
  createWidget: (config, callbacks?: WidgetCallbacks) =>
    new GeolocateWidget({
      id: config.id,
      ...config.settings,
      onGeolocate:
        callbacks?.onViewStateChange || callbacks?.geolocate?.onLocation
          ? ({ latitude, longitude, zoom, accuracy }: { latitude: number; longitude: number; zoom: number; accuracy?: number }) => {
              callbacks.geolocate?.onLocation({ latitude, longitude, zoom, accuracy });
              callbacks.onViewStateChange?.({
                latitude,
                longitude,
                zoom,
                transitionDuration: config.settings.transitionDuration,
              });
            }
        : undefined,
    }),
};

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
      fields: [
        { key: 'placement', label: 'Placement', type: 'select', selectOptions: PLACEMENTS, defaultValue: 'top-left' },
        // { key: 'label', label: 'Tooltip', type: 'string', defaultValue: 'Search location' },
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
  createWidget: (config, callbacks?: WidgetCallbacks) =>
    new GeocoderWidget({
      id: config.id,
      ...config.settings,
      onGeocode: callbacks?.onViewStateChange
        ? ({ coordinates }: { coordinates: { longitude: number; latitude: number; zoom?: number } }) =>
            callbacks.onViewStateChange!({
              ...coordinates,
              transitionDuration: config.settings.transitionDuration,
            })
        : undefined,
    }),
};
