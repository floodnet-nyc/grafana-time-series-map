import { PanelPlugin } from '@grafana/data';
// import { FieldColorModeId, FieldConfigProperty } from '@grafana/data';
import type { DeckDepthCompare, MapPanelOptions } from './types';
import type { DeckBlendFactor, DeckBlendOperation } from "types";
import { MapPanel } from './components/MapPanel';
import { LightingEditor } from './editor/LightingEditor';
import { InitialViewEditor } from './editor/InitialViewEditor';
import { MapPanelEditor } from './editor/MapPanelEditor';
import { MapPanelWidgetEditor } from './editor/MapPanelWidgetEditor';
import { TooltipTemplateEditor } from './editor/TooltipTemplateEditor';
import { PopupTemplateEditor } from './editor/PopupTemplateEditor';
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
        path: 'basemap.provider',
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
        path: 'basemap.maplibre.mapStyle',
        name: 'Map style',
        defaultValue: 'carto-dark',
        settings: {
          options: [
            { label: 'Carto Dark Matter', value: 'carto-dark' },
            { label: 'Carto Positron (light)', value: 'carto-light' },
            { label: 'Carto Voyager', value: 'carto-voyager' },
            { label: 'OpenStreetMap', value: 'osm' },
            { label: 'VersaTiles Colorful', value: 'versatiles-colorful' },
            { label: 'VersaTiles Graybeard', value: 'versatiles-graybeard' },
            { label: 'VersaTiles Eclipse', value: 'versatiles-eclipse' },
            { label: 'VersaTiles Neutrino', value: 'versatiles-neutrino' },
            { label: 'VersaTiles Shadow', value: 'versatiles-shadow' },
            { label: 'Custom URL', value: 'custom' },
          ],
        },
        showIf: (cfg) => cfg.basemap?.provider !== 'google',
        category: ['Basemap', 'MapLibre'],
      })
      .addTextInput({
        path: 'basemap.maplibre.mapStyleUrl',
        name: 'Map style URL',
        defaultValue: '',
        showIf: (cfg) => cfg.basemap?.provider !== 'google' && cfg.basemap?.maplibre?.mapStyle === 'custom',
        category: ['Basemap', 'MapLibre'],
      })
      .addSelect({
        path: 'basemap.maplibre.projection',
        name: 'Map projection',
        description: 'Google globe/3D behavior is configured through the Google Maps Map ID style console.',
        defaultValue: 'mercator',
        settings: {
          options: [
            { label: 'Mercator', value: 'mercator' },
            { label: 'Globe', value: 'globe' },
          ],
        },
        showIf: (cfg) => cfg.basemap?.provider !== 'google',
        category: ['Basemap', 'MapLibre'],
      })
      .addTextInput({
        path: 'basemap.google.apiKey',
        name: 'Google Maps API key',
        defaultValue: '',
        showIf: (cfg) => cfg.basemap?.provider === 'google',
        category: ['Basemap', 'Google Maps'],
      })
      .addTextInput({
        path: 'basemap.google.mapId',
        name: 'Google Maps Map ID',
        defaultValue: '',
        description: 'Cloud-based map styling ID (required for vector maps and 3D)',
        showIf: (cfg) => cfg.basemap?.provider === 'google',
        category: ['Basemap', 'Google Maps'],
      })
      .addSelect({
        path: 'basemap.google.colorScheme',
        name: 'Color Mode',
        defaultValue: 'LIGHT',
        settings: {
          options: [
            { label: 'Light', value: 'LIGHT' },
            { label: 'Dark', value: 'DARK' },
            { label: 'Auto', value: 'FOLLOW_SYSTEM' },
          ],
        },
        showIf: (cfg) => cfg.basemap?.provider === 'google',
        category: ['Basemap', 'Google Maps'],
      })
      .addCustomEditor({
        id: 'initialView',
        path: 'initialView',
        name: 'Map view',
        description: 'Configure the starting view or capture it from the current map.',
        editor: InitialViewEditor,
        defaultValue: {
          mode: 'manual',
          state: { latitude: 40.7128, longitude: -74.006, zoom: 11, bearing: 0, pitch: 0 },
          fitData: { source: 'allLayers', padding: 48, maxZoom: 22 },
        },
        category: ['Map bounds'],
      })
      .addBooleanSwitch({
        path: 'basemap.interactions.syncViewToUrl',
        name: 'Hash routing',
        description: 'Saves map view in url - sharing, bookmarking - #v=zoom/lat/lon/bearing/pitch.',
        defaultValue: false,
        category: ['Map bounds'],
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
        path: 'time.show',
        name: 'Show time playback controls',
        defaultValue: true,
        category: ['Time playback'],
      })
      .addBooleanSwitch({
        path: 'time.loop',
        name: 'Loop playback',
        defaultValue: true,
        showIf: (cfg) => cfg.time?.show !== false,
        category: ['Time playback'],
      })
      .addNumberInput({
        path: 'time.defaultSpeed',
        name: 'Default playback speed (data-ms per real-second)',
        defaultValue: 1_800_000,
        description: 'e.g. 1800000 = 30 minutes per second',
        showIf: (cfg) => cfg.time?.show !== false,
        category: ['Time playback'],
      })
      .addBooleanSwitch({
        path: 'legend.show',
        name: 'Show legend',
        defaultValue: false,
        category: ['Legend'],
      })
      .addBooleanSwitch({
        path: 'tooltip.show',
        name: 'Show hover tooltip',
        defaultValue: true,
        category: ['Tooltip'],
      })
      .addCustomEditor({
        id: 'tooltipTemplate',
        path: 'tooltip.template',
        name: 'Tooltip template',
        description: 'Liquid template. Use {{ prop_name }} for values, {% for p in properties %}...{% endfor %} to loop all fields.',
        editor: TooltipTemplateEditor,
        showIf: (cfg) => cfg.tooltip?.show !== false,
        category: ['Tooltip'],
      })
      .addBooleanSwitch({
        path: 'sync.publish',
        name: 'Publish playback time to other panels',
        description: 'Broadcast time cursor and hover selection to other panels. Displays a cursor at the current time on other time series panels.',
        defaultValue: true,
        category: ['Tooltip', 'Cross-panel sync'],
      })
      .addBooleanSwitch({
        path: 'sync.subscribe',
        name: 'Subscribe to time hover events from other panels',
        description: 'Receive time cursor and hover selection from other panels',
        defaultValue: true,
        category: ['Tooltip', 'Cross-panel sync'],
      })
      .addBooleanSwitch({
        path: 'popup.show',
        name: 'Show click popup',
        defaultValue: true,
        category: ['Popup'],
      })
      .addCustomEditor({
        id: 'popupTemplate',
        path: 'popup.template',
        name: 'Popup template',
        description: 'Liquid template shown in the click popup. Use {{ prop_name }} for values, {{ _key }} for the selected key, {% for p in properties %}...{% endfor %} to loop all fields.',
        editor: PopupTemplateEditor,
        showIf: (cfg) => cfg.popup?.show !== false,
        category: ['Popup'],
      })
      .addTextInput({
        path: 'sync.selectionVariableName',
        name: 'Selection variable',
        description: 'Optional dashboard variable name to update from the current selected key. Use the bare variable name, not the var- prefix.',
        defaultValue: '',
        category: ['Popup'],
      })
      .addCustomEditor({
        id: 'widgets',
        path: 'widgets',
        name: 'Widgets',
        description: 'Add and configure deck.gl map widgets',
        editor: MapPanelWidgetEditor,
        defaultValue: [],
        category: ['Widgets'],
      })
      .addBooleanSwitch({
        path: 'basemap.interactions.interactive',
        name: 'Interactive map',
        description: 'Enable user map gestures such as drag, zoom, rotate, and keyboard navigation.',
        defaultValue: true,
        category: ['Map controls', 'Interactions'],
      })
      .addBooleanSwitch({
        path: 'basemap.interactions.cooperativeGestures',
        name: 'Cooperative gestures',
        description: 'Require Ctrl/Cmd or two-finger gestures before scroll zoom and rotate interactions capture the page.',
        defaultValue: false,
        showIf: (cfg) => cfg.basemap?.interactions?.interactive !== false,
        category: ['Map controls', 'Interactions'],
      })
      .addBooleanSwitch({
        path: 'basemap.interactions.rollEnabled',
        name: 'Enable 3D',
        description: 'Allows camera roll with Ctrl + drag.',
        defaultValue: true,
        showIf: (cfg) => cfg.basemap?.interactions?.interactive !== false,
        category: ['Map controls', 'Interactions'],
      })
      .addBooleanSwitch({
        path: 'basemap.controls.navigationControl',
        name: 'Navigation control',
        description: 'MapLibre zoom/compass control or Google camera control.',
        defaultValue: true,
        category: ['Map controls'],
      })
      .addSelect({
        path: 'basemap.controlSettings.navigation.position',
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
        showIf: (cfg) => cfg.basemap?.controls?.navigationControl !== false,
        category: ['Map controls'],
      })
      .addBooleanSwitch({
        path: 'basemap.controlSettings.navigation.showZoom',
        name: 'Show zoom buttons',
        defaultValue: true,
        showIf: (cfg) => cfg.basemap?.controls?.navigationControl !== false,
        category: ['Map controls'],
      })
      .addBooleanSwitch({
        path: 'basemap.controlSettings.navigation.showCompass',
        name: 'Show compass button',
        defaultValue: true,
        showIf: (cfg) => cfg.basemap?.controls?.navigationControl !== false,
        category: ['Map controls'],
      })
      .addBooleanSwitch({
        path: 'basemap.controlSettings.navigation.visualizePitch',
        name: 'Visualize pitch',
        defaultValue: false,
        showIf: (cfg) => cfg.basemap?.controls?.navigationControl !== false && cfg.basemap?.provider !== 'google',
        category: ['Map controls'],
      })
      .addBooleanSwitch({
        path: 'basemap.controlSettings.navigation.visualizeRoll',
        name: 'Visualize roll',
        defaultValue: false,
        showIf: (cfg) => cfg.basemap?.controls?.navigationControl !== false && cfg.basemap?.provider !== 'google',
        category: ['Map controls'],
      })
      .addBooleanSwitch({
        path: 'basemap.controls.fullscreenControl',
        name: 'Fullscreen control',
        defaultValue: false,
        category: ['Map controls'],
      })
      .addSelect({
        path: 'basemap.controlSettings.fullscreen.position',
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
        showIf: (cfg) => cfg.basemap?.controls?.fullscreenControl === true,
        category: ['Map controls'],
      })
      .addBooleanSwitch({
        path: 'basemap.controls.scaleControl',
        name: 'Scale control',
        defaultValue: false,
        category: ['Map controls'],
      })
      .addBooleanSwitch({
        path: 'basemap.google.mapTypeControl',
        name: 'Map type control',
        defaultValue: false,
        showIf: (cfg) => cfg.basemap?.provider === 'google',
        category: ['Map controls', 'Google Maps controls'],
      })
      .addBooleanSwitch({
        path: 'basemap.google.streetViewControl',
        name: 'Street View control',
        defaultValue: false,
        showIf: (cfg) => cfg.basemap?.provider === 'google',
        category: ['Map controls', 'Google Maps controls'],
      })
      // .addSelect({
      //   path: 'basemap.google.mapTypeControlPosition',
      //   name: 'Map type control position',
      //   defaultValue: 'TOP_LEFT',
      //   settings: { options: googleControlPositions },
      //   showIf: (cfg) => cfg.basemap?.provider === 'google' && cfg.basemap?.google?.mapTypeControl === true,
      //   category: ['Map controls', 'Google Maps placement'],
      // })
      // .addSelect({
      //   path: 'basemap.google.mapTypeControlStyle',
      //   name: 'Map type control style',
      //   defaultValue: 'DEFAULT',
      //   settings: {
      //     options: [
      //       { label: 'Default', value: 'DEFAULT' },
      //       { label: 'Dropdown menu', value: 'DROPDOWN_MENU' },
      //       { label: 'Horizontal bar', value: 'HORIZONTAL_BAR' },
      //     ],
      //   },
      //   showIf: (cfg) => cfg.basemap?.provider === 'google' && cfg.basemap?.google?.mapTypeControl === true,
      //   category: ['Map controls', 'Google Maps placement'],
      // })
      .addSelect({
        path: 'basemap.google.streetViewControlPosition',
        name: 'Street View control position',
        defaultValue: 'RIGHT_BOTTOM',
        settings: { options: googleControlPositions },
        showIf: (cfg) => cfg.basemap?.provider === 'google' && cfg.basemap?.google?.streetViewControl === true,
        category: ['Map controls', 'Google Maps placement'],
      })
      .addBooleanSwitch({
        path: 'deck.interleaved',
        name: 'Interleaved rendering',
        description: 'Render deck.gl layers between basemap layers so map labels appear on top. Disable to render all deck.gl layers above the basemap.',
        defaultValue: true,
        category: ['Rendering'],
      })
      .addBooleanSwitch({
        path: 'deck.parameters.blend',
        name: 'Custom Blending',
        description: 'Enable GPU blending for deck.gl rendering. Layer parameters can still override this.',
        defaultValue: DEFAULT_DECK_PARAMETERS.blend,
        category: ['Rendering'],
      })
      .addSelect({
        path: 'deck.parameters.blendColorOperation',
        name: 'Color blend operation',
        defaultValue: DEFAULT_DECK_PARAMETERS.blendColorOperation,
        settings: { options: deckBlendOperations },
        category: ['Rendering', 'Blending'],
        showIf: (cfg) => cfg.deck?.parameters?.blend === true,
      })
      .addSelect({
        path: 'deck.parameters.blendColorSrcFactor',
        name: 'Color source factor',
        defaultValue: DEFAULT_DECK_PARAMETERS.blendColorSrcFactor,
        settings: { options: deckBlendFactors },
        category: ['Rendering', 'Blending'],
        showIf: (cfg) => cfg.deck?.parameters?.blend === true,
      })
      .addSelect({
        path: 'deck.parameters.blendColorDstFactor',
        name: 'Color destination factor',
        defaultValue: DEFAULT_DECK_PARAMETERS.blendColorDstFactor,
        settings: { options: deckBlendFactors },
        category: ['Rendering', 'Blending'],
        showIf: (cfg) => cfg.deck?.parameters?.blend === true,
      })
      .addSelect({
        path: 'deck.parameters.blendAlphaOperation',
        name: 'Alpha blend operation',
        defaultValue: DEFAULT_DECK_PARAMETERS.blendAlphaOperation,
        settings: { options: deckBlendOperations },
        category: ['Rendering', 'Blending'],
        showIf: (cfg) => cfg.deck?.parameters?.blend === true,
      })
      .addSelect({
        path: 'deck.parameters.blendAlphaSrcFactor',
        name: 'Alpha source factor',
        defaultValue: DEFAULT_DECK_PARAMETERS.blendAlphaSrcFactor,
        settings: { options: deckBlendFactors },
        category: ['Rendering', 'Blending'],
        showIf: (cfg) => cfg.deck?.parameters?.blend === true,
      })
      .addSelect({
        path: 'deck.parameters.blendAlphaDstFactor',
        name: 'Alpha destination factor',
        defaultValue: DEFAULT_DECK_PARAMETERS.blendAlphaDstFactor,
        settings: { options: deckBlendFactors },
        category: ['Rendering', 'Blending'],
        showIf: (cfg) => cfg.deck?.parameters?.blend === true,
      })
      .addBooleanSwitch({
        path: 'deck.parameters.polygonOffsetFill',
        name: 'Polygon offset fill',
        defaultValue: DEFAULT_DECK_PARAMETERS.polygonOffsetFill,
        category: ['Rendering', 'Depth'],
        showIf: (cfg) => cfg.deck?.parameters?.blend === true,
      })
      .addBooleanSwitch({
        path: 'deck.parameters.depthWriteEnabled',
        name: 'Depth write enabled',
        defaultValue: DEFAULT_DECK_PARAMETERS.depthWriteEnabled,
        category: ['Rendering', 'Depth'],
        showIf: (cfg) => cfg.deck?.parameters?.blend === true,
      })
      .addSelect({
        path: 'deck.parameters.depthCompare',
        name: 'Depth compare',
        defaultValue: DEFAULT_DECK_PARAMETERS.depthCompare,
        settings: { options: deckDepthCompareOptions },
        category: ['Rendering', 'Depth'],
        showIf: (cfg) => cfg.deck?.parameters?.blend === true,
      })
      .addCustomEditor({
        id: 'deckLighting',
        path: 'deck.lighting',
        name: 'Custom Lighting',
        description: 'Configure deck.gl LightingEffect light sources.',
        editor: LightingEditor,
        defaultValue: DEFAULT_DECK_LIGHTING,
        category: ['Rendering', 'Lighting'],
      });
  });
