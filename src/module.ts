import { PanelPlugin } from '@grafana/data';
// import { FieldColorModeId, FieldConfigProperty } from '@grafana/data';
import type { MapPanelOptions } from './types';
import { MapPanel } from './components/MapPanel';
import { MapPanelEditor } from './editor/MapPanelEditor';
// import { commonOptionsBuilder } from '@grafana/ui';

export const plugin = new PanelPlugin<MapPanelOptions>(MapPanel)
  .setNoPadding()
  // .useFieldConfig({
  //   disableStandardOptions: [FieldConfigProperty.Thresholds],
  //   standardOptions: {
  //     [FieldConfigProperty.Color]: {
  //       settings: {
  //         byValueSupport: false,
  //         bySeriesSupport: true,
  //         preferThresholdsMode: false,
  //         gradientSupport: true,
  //       },
  //       defaultValue: {
  //         mode: FieldColorModeId.PaletteClassic,
  //         // Seed fixedColor so switching to Single color, Shades, or Gradient
  //         // on a fresh panel shows a meaningful color instead of an empty picker.
  //         fixedColor: '#73BF69',
  //       },
  //     },
  //   },
  //   useCustomConfig: (builder) => {
  //     commonOptionsBuilder.addHideFrom(builder);
  //   },
  // })
  .setPanelOptions((builder) => {
    builder
      .addRadio({
        path: 'basemapProvider',
        name: 'Basemap provider',
        defaultValue: 'maplibre',
        settings: {
          options: [
            { label: 'Maplibre GL', value: 'maplibre' },
            { label: 'Google Maps', value: 'google' },
          ],
        },
      })
      .addSelect({
        path: 'maplibreStyle',
        name: 'Maplibre style',
        defaultValue: 'carto-dark',
        settings: {
          options: [
            { label: 'Carto Dark Matter', value: 'carto-dark' },
            { label: 'Carto Positron (light)', value: 'carto-light' },
            { label: 'OpenStreetMap', value: 'osm' },
            { label: 'Custom URL', value: 'custom' },
          ],
        },
        showIf: (cfg) => cfg.basemapProvider !== 'google',
      })
      .addTextInput({
        path: 'maplibreStyleUrl',
        name: 'Maplibre style URL',
        defaultValue: '',
        showIf: (cfg) => cfg.basemapProvider !== 'google' && cfg.maplibreStyle === 'custom',
      })
      .addTextInput({
        path: 'googleMapsApiKey',
        name: 'Google Maps API key',
        defaultValue: '',
        showIf: (cfg) => cfg.basemapProvider === 'google',
      })
      .addTextInput({
        path: 'googleMapsMapId',
        name: 'Google Maps Map ID',
        defaultValue: '',
        description: 'Cloud-based map styling ID (required for vector maps and 3D)',
        showIf: (cfg) => cfg.basemapProvider === 'google',
      })
      .addSelect({
        path: 'initialViewMode',
        name: 'Initial view',
        defaultValue: 'manual',
        description: 'Manual: use the coordinates below. Fit to data: zoom to fit all layer features on load.',
        settings: {
          options: [
            { label: 'Manual', value: 'manual' },
            { label: 'Fit to data', value: 'fitData' },
          ],
        },
        category: ['Map bounds'],
      })
      .addNumberInput({
        path: 'initialLatitude',
        name: 'Latitude',
        defaultValue: 40.7128,
        showIf: (cfg) => cfg.initialViewMode !== 'fitData',
        category: ['Map bounds'],
      })
      .addNumberInput({
        path: 'initialLongitude',
        name: 'Longitude',
        defaultValue: -74.006,
        showIf: (cfg) => cfg.initialViewMode !== 'fitData',
        category: ['Map bounds'],
      })
      .addNumberInput({
        path: 'initialZoom',
        name: 'Zoom',
        defaultValue: 11,
        settings: { min: 0, max: 22 },
        showIf: (cfg) => cfg.initialViewMode !== 'fitData',
        category: ['Map bounds'],
      })
      .addNumberInput({
        path: 'initialBearing',
        name: 'Bearing (°)',
        defaultValue: 0,
        description: 'Rotation in degrees clockwise from north (0–360)',
        settings: { min: -180, max: 360 },
        category: ['Map bounds'],
      })
      .addNumberInput({
        path: 'initialPitch',
        name: 'Pitch (°)',
        defaultValue: 0,
        description: 'Tilt in degrees from vertical. 0 = top-down, 60 = oblique.',
        settings: { min: 0, max: 85 },
        category: ['Map bounds'],
      })
      .addBooleanSwitch({
        path: 'showTimeControls',
        name: 'Show time playback controls',
        defaultValue: true,
      })
      .addBooleanSwitch({
        path: 'loopPlayback',
        name: 'Loop playback',
        defaultValue: true,
      })
      .addNumberInput({
        path: 'defaultPlaybackSpeed',
        name: 'Default playback speed (data-ms per real-second)',
        defaultValue: 1_800_000,
        description: 'e.g. 1800000 = 30 minutes per second',
      })
      .addBooleanSwitch({
        path: 'showLegend',
        name: 'Show legend',
        defaultValue: false,
      })
      .addBooleanSwitch({
        path: 'interleaved',
        name: 'Interleaved rendering',
        description: 'Render deck.gl layers between basemap layers so map labels appear on top. Disable to render all deck.gl layers above the basemap.',
        defaultValue: true,
      })
      .addBooleanSwitch({
        path: 'syncPublish',
        name: 'Publish cursor & selection',
        description: 'Broadcast time cursor and hover selection to other panels',
        defaultValue: true,
        category: ['Cross-panel sync'],
      })
      .addBooleanSwitch({
        path: 'syncSubscribe',
        name: 'Subscribe to cursor & selection',
        description: 'Receive time cursor and hover selection from other panels',
        defaultValue: true,
        category: ['Cross-panel sync'],
      })
      .addCustomEditor({
        id: 'layers',
        path: 'layers',
        name: 'Layers',
        description: 'Add and configure deck.gl layers',
        editor: MapPanelEditor,
        defaultValue: [],
      });
  });
