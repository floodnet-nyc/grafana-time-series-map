import { PanelPlugin } from '@grafana/data';
// import { FieldColorModeId, FieldConfigProperty } from '@grafana/data';
import type { DeckBlendFactor, DeckBlendOperation, DeckDepthCompare, MapPanelOptions } from './types';
import { MapPanel } from './components/MapPanel';
import { LightingEditor } from './editor/LightingEditor';
import { MapPanelEditor } from './editor/MapPanelEditor';
import { DEFAULT_DECK_LIGHTING } from './utils/deckgl/lighting';
import { DEFAULT_DECK_PARAMETERS } from './utils/deckgl/parameters';
// import { commonOptionsBuilder } from '@grafana/ui';

const googleControlPositions = [
  { label: 'Start top', value: 'INLINE_START_BLOCK_START' },
  { label: 'Start center', value: 'INLINE_START_BLOCK_CENTER' },
  { label: 'Start bottom', value: 'INLINE_START_BLOCK_END' },
  { label: 'End top', value: 'INLINE_END_BLOCK_START' },
  { label: 'End center', value: 'INLINE_END_BLOCK_CENTER' },
  { label: 'End bottom', value: 'INLINE_END_BLOCK_END' },
  { label: 'Top start', value: 'BLOCK_START_INLINE_START' },
  { label: 'Top center (logical)', value: 'BLOCK_START_INLINE_CENTER' },
  { label: 'Top end', value: 'BLOCK_START_INLINE_END' },
  { label: 'Bottom start', value: 'BLOCK_END_INLINE_START' },
  { label: 'Bottom center (logical)', value: 'BLOCK_END_INLINE_CENTER' },
  { label: 'Bottom end', value: 'BLOCK_END_INLINE_END' },
  { label: 'Top left', value: 'TOP_LEFT' },
  { label: 'Top center', value: 'TOP_CENTER' },
  { label: 'Top right', value: 'TOP_RIGHT' },
  { label: 'Left top', value: 'LEFT_TOP' },
  { label: 'Left center', value: 'LEFT_CENTER' },
  { label: 'Left bottom', value: 'LEFT_BOTTOM' },
  { label: 'Right top', value: 'RIGHT_TOP' },
  { label: 'Right center', value: 'RIGHT_CENTER' },
  { label: 'Right bottom', value: 'RIGHT_BOTTOM' },
  { label: 'Bottom left', value: 'BOTTOM_LEFT' },
  { label: 'Bottom center', value: 'BOTTOM_CENTER' },
  { label: 'Bottom right', value: 'BOTTOM_RIGHT' },
];

const deckBlendOperations: Array<{ label: string; value: DeckBlendOperation }> = [
  { label: 'Add', value: 'add' },
  { label: 'Subtract', value: 'subtract' },
  { label: 'Reverse subtract', value: 'reverse-subtract' },
  { label: 'Min', value: 'min' },
  { label: 'Max', value: 'max' },
];

const deckBlendFactors: Array<{ label: string; value: DeckBlendFactor }> = [
  { label: 'Zero', value: 'zero' },
  { label: 'One', value: 'one' },
  { label: 'Source', value: 'src' },
  { label: 'One minus source', value: 'one-minus-src' },
  { label: 'Source alpha', value: 'src-alpha' },
  { label: 'One minus source alpha', value: 'one-minus-src-alpha' },
  { label: 'Destination', value: 'dst' },
  { label: 'One minus destination', value: 'one-minus-dst' },
  { label: 'Destination alpha', value: 'dst-alpha' },
  { label: 'One minus destination alpha', value: 'one-minus-dst-alpha' },
  { label: 'Source alpha saturated', value: 'src-alpha-saturated' },
  { label: 'Constant', value: 'constant' },
  { label: 'One minus constant', value: 'one-minus-constant' },
];

const deckDepthCompareOptions: Array<{ label: string; value: DeckDepthCompare }> = [
  { label: 'Never', value: 'never' },
  { label: 'Less', value: 'less' },
  { label: 'Equal', value: 'equal' },
  { label: 'Less or equal', value: 'less-equal' },
  { label: 'Greater', value: 'greater' },
  { label: 'Not equal', value: 'not-equal' },
  { label: 'Greater or equal', value: 'greater-equal' },
  { label: 'Always', value: 'always' },
];

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
        category: ['Basemap'],
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
        category: ['Basemap', 'MapLibre'],
      })
      .addTextInput({
        path: 'maplibreStyleUrl',
        name: 'Maplibre style URL',
        defaultValue: '',
        showIf: (cfg) => cfg.basemapProvider !== 'google' && cfg.maplibreStyle === 'custom',
        category: ['Basemap', 'MapLibre'],
      })
      .addSelect({
        path: 'maplibreProjection',
        name: 'MapLibre projection',
        description: 'Google globe/3D behavior is configured through the Google Maps Map ID style console.',
        defaultValue: 'mercator',
        settings: {
          options: [
            { label: 'Mercator', value: 'mercator' },
            { label: 'Globe', value: 'globe' },
          ],
        },
        showIf: (cfg) => cfg.basemapProvider !== 'google',
        category: ['Basemap', 'MapLibre'],
      })
      .addTextInput({
        path: 'googleMapsApiKey',
        name: 'Google Maps API key',
        defaultValue: '',
        showIf: (cfg) => cfg.basemapProvider === 'google',
        category: ['Basemap', 'Google Maps'],
      })
      .addTextInput({
        path: 'googleMapsMapId',
        name: 'Google Maps Map ID',
        defaultValue: '',
        description: 'Cloud-based map styling ID (required for vector maps and 3D)',
        showIf: (cfg) => cfg.basemapProvider === 'google',
        category: ['Basemap', 'Google Maps'],
      })
      .addSelect({
        path: 'googleMapOptions.colorScheme',
        name: 'Google Maps color scheme',
        defaultValue: 'LIGHT',
        settings: {
          options: [
            { label: 'Light', value: 'LIGHT' },
            { label: 'Dark', value: 'DARK' },
            { label: 'Auto', value: 'FOLLOW_SYSTEM' },
          ],
        },
        showIf: (cfg) => cfg.basemapProvider === 'google',
        category: ['Basemap', 'Google Maps'],
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
        category: ['Time playback'],
      })
      .addBooleanSwitch({
        path: 'loopPlayback',
        name: 'Loop playback',
        defaultValue: true,
        showIf: (cfg) => cfg.showTimeControls !== false,
        category: ['Time playback'],
      })
      .addNumberInput({
        path: 'defaultPlaybackSpeed',
        name: 'Default playback speed (data-ms per real-second)',
        defaultValue: 1_800_000,
        description: 'e.g. 1800000 = 30 minutes per second',
        showIf: (cfg) => cfg.showTimeControls !== false,
        category: ['Time playback'],
      })
      .addBooleanSwitch({
        path: 'showLegend',
        name: 'Show legend',
        defaultValue: false,
        category: ['Legend'],
      })
      .addCustomEditor({
        id: 'layers',
        path: 'layers',
        name: 'Layers',
        description: 'Add and configure deck.gl layers',
        editor: MapPanelEditor,
        defaultValue: [],
        category: ['Layers'],
      })
      .addBooleanSwitch({
        path: 'interactions.interactive',
        name: 'Interactive map',
        description: 'Enable user map gestures such as drag, zoom, rotate, and keyboard navigation.',
        defaultValue: true,
        category: ['Map controls', 'Interactions'],
      })
      .addBooleanSwitch({
        path: 'interactions.cooperativeGestures',
        name: 'Cooperative gestures',
        description: 'Require Ctrl/Cmd or two-finger gestures before scroll zoom and rotate interactions capture the page.',
        defaultValue: false,
        showIf: (cfg) => cfg.interactions?.interactive !== false,
        category: ['Map controls', 'Interactions'],
      })
      .addBooleanSwitch({
        path: 'interactions.syncViewToUrl',
        name: 'Hash routing',
        description: 'Stores the current view as URL hash parameter v=zoom/lat/lon. MapLibre uses its native hash support; Google Maps uses a matching custom implementation.',
        defaultValue: false,
        category: ['Map controls', 'Interactions'],
      })
      .addBooleanSwitch({
        path: 'interactions.rollEnabled',
        name: 'Enable 3D',
        description: 'MapLibre only. Allows camera roll with Ctrl + drag.',
        defaultValue: true,
        showIf: (cfg) => cfg.basemapProvider !== 'google' && cfg.interactions?.interactive !== false,
        category: ['Map controls', 'Interactions'],
      })
      .addBooleanSwitch({
        path: 'controls.navigationControl',
        name: 'Navigation control',
        description: 'MapLibre zoom/compass control or Google camera control.',
        defaultValue: true,
        category: ['Map controls'],
      })
      .addSelect({
        path: 'controlSettings.navigation.position',
        name: 'Navigation control position',
        defaultValue: 'top-right',
        settings: {
          options: [
            { label: 'Top left', value: 'top-left' },
            { label: 'Top right', value: 'top-right' },
            { label: 'Bottom left', value: 'bottom-left' },
            { label: 'Bottom right', value: 'bottom-right' },
          ],
        },
        showIf: (cfg) => cfg.controls?.navigationControl !== false,
        category: ['Map controls'],
      })
      .addBooleanSwitch({
        path: 'controlSettings.navigation.showZoom',
        name: 'Show zoom buttons',
        defaultValue: true,
        showIf: (cfg) => cfg.controls?.navigationControl !== false,
        category: ['Map controls'],
      })
      .addBooleanSwitch({
        path: 'controlSettings.navigation.showCompass',
        name: 'Show compass button',
        defaultValue: true,
        showIf: (cfg) => cfg.controls?.navigationControl !== false,
        category: ['Map controls'],
      })
      .addBooleanSwitch({
        path: 'controlSettings.navigation.visualizePitch',
        name: 'Visualize pitch',
        defaultValue: false,
        showIf: (cfg) => cfg.controls?.navigationControl !== false && cfg.basemapProvider !== 'google',
        category: ['Map controls'],
      })
      .addBooleanSwitch({
        path: 'controlSettings.navigation.visualizeRoll',
        name: 'Visualize roll',
        defaultValue: false,
        showIf: (cfg) => cfg.controls?.navigationControl !== false && cfg.basemapProvider !== 'google',
        category: ['Map controls'],
      })
      .addBooleanSwitch({
        path: 'controls.geolocateControl',
        name: 'Geolocate control',
        description: 'Find the user location using the browser geolocation API.',
        defaultValue: false,
        showIf: (cfg) => cfg.interactions?.interactive !== false,
        category: ['Map controls'],
      })
      .addSelect({
        path: 'controlSettings.geolocate.position',
        name: 'Geolocate control position',
        defaultValue: 'top-right',
        settings: {
          options: [
            { label: 'Top left', value: 'top-left' },
            { label: 'Top right', value: 'top-right' },
            { label: 'Bottom left', value: 'bottom-left' },
            { label: 'Bottom right', value: 'bottom-right' },
          ],
        },
        showIf: (cfg) => cfg.interactions?.interactive !== false && cfg.controls?.geolocateControl === true,
        category: ['Map controls'],
      })
      .addBooleanSwitch({
        path: 'controlSettings.geolocate.trackUserLocation',
        name: 'Track user location',
        description: 'MapLibre only. Keep watching the user position after geolocation is enabled.',
        defaultValue: false,
        showIf: (cfg) => cfg.interactions?.interactive !== false && cfg.controls?.geolocateControl === true && cfg.basemapProvider !== 'google',
        category: ['Map controls'],
      })
      .addBooleanSwitch({
        path: 'controls.fullscreenControl',
        name: 'Fullscreen control',
        defaultValue: false,
        category: ['Map controls'],
      })
      .addSelect({
        path: 'controlSettings.fullscreen.position',
        name: 'Fullscreen control position',
        defaultValue: 'top-right',
        settings: {
          options: [
            { label: 'Top left', value: 'top-left' },
            { label: 'Top right', value: 'top-right' },
            { label: 'Bottom left', value: 'bottom-left' },
            { label: 'Bottom right', value: 'bottom-right' },
          ],
        },
        showIf: (cfg) => cfg.controls?.fullscreenControl === true,
        category: ['Map controls'],
      })
      .addBooleanSwitch({
        path: 'controls.scaleControl',
        name: 'Scale control',
        defaultValue: false,
        category: ['Map controls'],
      })
      .addBooleanSwitch({
        path: 'googleMapOptions.mapTypeControl',
        name: 'Map type control',
        defaultValue: false,
        showIf: (cfg) => cfg.basemapProvider === 'google',
        category: ['Map controls', 'Google Maps controls'],
      })
      .addBooleanSwitch({
        path: 'googleMapOptions.streetViewControl',
        name: 'Street View control',
        defaultValue: false,
        showIf: (cfg) => cfg.basemapProvider === 'google',
        category: ['Map controls', 'Google Maps controls'],
      })
      .addBooleanSwitch({
        path: 'googleMapOptions.rotateControl',
        name: 'Rotate control',
        description: 'Google only. Appears when 45-degree or 3D imagery is available.',
        defaultValue: false,
        showIf: (cfg) => cfg.basemapProvider === 'google',
        category: ['Map controls', 'Google Maps controls'],
      })
      .addSelect({
        path: 'googleMapOptions.mapTypeControlPosition',
        name: 'Map type control position',
        defaultValue: 'TOP_LEFT',
        settings: { options: googleControlPositions },
        showIf: (cfg) => cfg.basemapProvider === 'google' && cfg.googleMapOptions?.mapTypeControl === true,
        category: ['Map controls', 'Google Maps placement'],
      })
      .addSelect({
        path: 'googleMapOptions.mapTypeControlStyle',
        name: 'Map type control style',
        defaultValue: 'DEFAULT',
        settings: {
          options: [
            { label: 'Default', value: 'DEFAULT' },
            { label: 'Dropdown menu', value: 'DROPDOWN_MENU' },
            { label: 'Horizontal bar', value: 'HORIZONTAL_BAR' },
          ],
        },
        showIf: (cfg) => cfg.basemapProvider === 'google' && cfg.googleMapOptions?.mapTypeControl === true,
        category: ['Map controls', 'Google Maps placement'],
      })
      .addSelect({
        path: 'googleMapOptions.streetViewControlPosition',
        name: 'Street View control position',
        defaultValue: 'RIGHT_BOTTOM',
        settings: { options: googleControlPositions },
        showIf: (cfg) => cfg.basemapProvider === 'google' && cfg.googleMapOptions?.streetViewControl === true,
        category: ['Map controls', 'Google Maps placement'],
      })
      .addSelect({
        path: 'googleMapOptions.rotateControlPosition',
        name: 'Rotate control position',
        defaultValue: 'RIGHT_BOTTOM',
        settings: { options: googleControlPositions },
        showIf: (cfg) => cfg.basemapProvider === 'google' && cfg.googleMapOptions?.rotateControl === true,
        category: ['Map controls', 'Google Maps placement'],
      })
      .addBooleanSwitch({
        path: 'syncPublish',
        name: 'Publish playback time to other panels',
        description: 'Broadcast time cursor and hover selection to other panels. Displays a cursor at the current time on other time series panels.',
        defaultValue: true,
        category: ['Map controls', 'Cross-panel sync'],
      })
      .addBooleanSwitch({
        path: 'syncSubscribe',
        name: 'Subscribe to time hover events from other panels',
        description: 'Receive time cursor and hover selection from other panels',
        defaultValue: true,
        category: ['Map controls', 'Cross-panel sync'],
      })
      .addBooleanSwitch({
        path: 'interleaved',
        name: 'Interleaved rendering',
        description: 'Render deck.gl layers between basemap layers so map labels appear on top. Disable to render all deck.gl layers above the basemap.',
        defaultValue: true,
        category: ['Rendering'],
      })
      .addBooleanSwitch({
        path: 'deckParameters.blend',
        name: 'Blend',
        description: 'Enable GPU blending for deck.gl rendering. Layer parameters can still override this.',
        defaultValue: DEFAULT_DECK_PARAMETERS.blend,
        category: ['Rendering'],
      })
      .addSelect({
        path: 'deckParameters.blendColorOperation',
        name: 'Color blend operation',
        defaultValue: DEFAULT_DECK_PARAMETERS.blendColorOperation,
        settings: { options: deckBlendOperations },
        category: ['Rendering', 'Blending'],
      })
      .addSelect({
        path: 'deckParameters.blendColorSrcFactor',
        name: 'Color source factor',
        defaultValue: DEFAULT_DECK_PARAMETERS.blendColorSrcFactor,
        settings: { options: deckBlendFactors },
        category: ['Rendering', 'Blending'],
      })
      .addSelect({
        path: 'deckParameters.blendColorDstFactor',
        name: 'Color destination factor',
        defaultValue: DEFAULT_DECK_PARAMETERS.blendColorDstFactor,
        settings: { options: deckBlendFactors },
        category: ['Rendering', 'Blending'],
      })
      .addSelect({
        path: 'deckParameters.blendAlphaOperation',
        name: 'Alpha blend operation',
        defaultValue: DEFAULT_DECK_PARAMETERS.blendAlphaOperation,
        settings: { options: deckBlendOperations },
        category: ['Rendering', 'Blending'],
      })
      .addSelect({
        path: 'deckParameters.blendAlphaSrcFactor',
        name: 'Alpha source factor',
        defaultValue: DEFAULT_DECK_PARAMETERS.blendAlphaSrcFactor,
        settings: { options: deckBlendFactors },
        category: ['Rendering', 'Blending'],
      })
      .addSelect({
        path: 'deckParameters.blendAlphaDstFactor',
        name: 'Alpha destination factor',
        defaultValue: DEFAULT_DECK_PARAMETERS.blendAlphaDstFactor,
        settings: { options: deckBlendFactors },
        category: ['Rendering', 'Blending'],
      })
      .addBooleanSwitch({
        path: 'deckParameters.polygonOffsetFill',
        name: 'Polygon offset fill',
        defaultValue: DEFAULT_DECK_PARAMETERS.polygonOffsetFill,
        category: ['Rendering', 'Depth'],
      })
      .addBooleanSwitch({
        path: 'deckParameters.depthWriteEnabled',
        name: 'Depth write enabled',
        defaultValue: DEFAULT_DECK_PARAMETERS.depthWriteEnabled,
        category: ['Rendering', 'Depth'],
      })
      .addSelect({
        path: 'deckParameters.depthCompare',
        name: 'Depth compare',
        defaultValue: DEFAULT_DECK_PARAMETERS.depthCompare,
        settings: { options: deckDepthCompareOptions },
        category: ['Rendering', 'Depth'],
      })
      .addCustomEditor({
        id: 'deckLighting',
        path: 'deckLighting',
        name: 'Lighting',
        description: 'Configure deck.gl LightingEffect light sources.',
        editor: LightingEditor,
        defaultValue: DEFAULT_DECK_LIGHTING,
        category: ['Rendering', 'Lighting'],
      });
  });
