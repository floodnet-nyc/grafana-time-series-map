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
      .addNumberInput({
        path: 'initialLatitude',
        name: 'Initial latitude',
        defaultValue: 40.7128,
      })
      .addNumberInput({
        path: 'initialLongitude',
        name: 'Initial longitude',
        defaultValue: -74.006,
      })
      .addNumberInput({
        path: 'initialZoom',
        name: 'Initial zoom',
        defaultValue: 11,
        settings: { min: 0, max: 22 },
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
