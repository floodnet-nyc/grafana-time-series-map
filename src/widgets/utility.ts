import { 
  LoadingWidget, 
  ScreenshotWidget, 
  _StatsWidget as StatsWidget, 
  ThemeWidget,
  type LoadingWidgetProps,
  type ScreenshotWidgetProps,
  type StatsWidgetProps,
  type ThemeWidgetProps,
} from '@deck.gl/widgets';
import { PLACEMENTS, type BaseWidgetConfig, type WidgetDefinition } from './types';

type LoadingWidgetConfig = BaseWidgetConfig<'loading', Omit<LoadingWidgetProps, 'id'>>;
type ScreenshotWidgetConfig = BaseWidgetConfig<'screenshot', Omit<ScreenshotWidgetProps, 'id'>>;
type StatsWidgetConfig = BaseWidgetConfig<'stats', Omit<StatsWidgetProps, 'id'>>;
type ThemeWidgetConfig = BaseWidgetConfig<'theme', Omit<ThemeWidgetProps, 'id'>>;

// Not sure if grafana provides this state
export const loadingWidgetDefinition: WidgetDefinition<LoadingWidgetConfig> = {
  type: 'loading',
  label: 'Loading',
  description: 'Show a loading indicator while the map is busy.',
  createDefaultConfig: (i) => ({
    id: `widget-loading-${i + 1}`,
    type: 'loading',
    label: `Loading ${i + 1}`,
    visible: true,
    settings: { placement: 'top-left' },
  }),
  editorSections: [
    {
      title: 'Loading',
      fields: [
        { key: 'placement', label: 'Placement', type: 'select', selectOptions: PLACEMENTS, defaultValue: 'top-left' },
        { key: 'label', label: 'Tooltip', type: 'string', defaultValue: 'Loading' },
      ],
    },
  ],
  createWidget: (config) => new LoadingWidget({ id: config.id, ...config.settings }),
};

// TODO: html2canvas
export const screenshotWidgetDefinition: WidgetDefinition<ScreenshotWidgetConfig> = {
  type: 'screenshot',
  label: 'Screenshot',
  description: 'Add a button to capture the current map as an image.',
  createDefaultConfig: (i) => ({
    id: `widget-screenshot-${i + 1}`,
    type: 'screenshot',
    label: `Screenshot ${i + 1}`,
    visible: true,
    settings: { placement: 'top-right' },
  }),
  editorSections: [
    {
      title: 'Screenshot',
      fields: [
        { key: 'placement', label: 'Placement', type: 'select', selectOptions: PLACEMENTS, defaultValue: 'top-right' },
        { key: 'label', label: 'Tooltip', type: 'string', defaultValue: 'Screenshot' },
        { key: 'filename', label: 'Filename', type: 'string', defaultValue: 'screenshot.png' },
        {
          key: 'imageFormat',
          label: 'Format',
          type: 'select',
          defaultValue: 'image/png',
          selectOptions: [{ label: 'PNG', value: 'image/png' }, { label: 'JPEG', value: 'image/jpeg' }],
        },
      ],
    },
  ],
  createWidget: (config) => new ScreenshotWidget({ id: config.id, ...config.settings }),
};

export const statsWidgetDefinition: WidgetDefinition<StatsWidgetConfig> = {
  type: 'stats',
  label: 'Stats',
  description: 'Display rendering and device performance statistics.',
  createDefaultConfig: (i) => ({
    id: `widget-stats-${i + 1}`,
    type: 'stats',
    label: `Stats ${i + 1}`,
    visible: true,
    settings: { placement: 'bottom-left', type: 'deck', framesPerUpdate: 1 },
  }),
  editorSections: [
    {
      title: 'Stats',
      fields: [
        { key: 'placement', label: 'Placement', type: 'select', selectOptions: PLACEMENTS, defaultValue: 'bottom-left' },
        {
          key: 'type',
          label: 'Stats type',
          type: 'select',
          defaultValue: 'deck',
          selectOptions: [
            { label: 'Deck', value: 'deck' },
            { label: 'Luma', value: 'luma' },
            { label: 'Device', value: 'device' },
          ],
        },
        { key: 'title', label: 'Title', type: 'string', defaultValue: '' },
        { key: 'framesPerUpdate', label: 'Frames per update', type: 'number', defaultValue: 1 },
        { key: 'initialExpanded', label: 'Initially expanded', type: 'boolean', defaultValue: false },
      ],
    },
  ],
  createWidget: (config) => new StatsWidget({ id: config.id, ...config.settings }),
};

// TODO: pass in callbacks
export const themeWidgetDefinition: WidgetDefinition<ThemeWidgetConfig> = {
  type: 'theme',
  label: 'Theme',
  description: 'Add a control to switch between light and dark themes.',
  createDefaultConfig: (i) => ({
    id: `widget-theme-${i + 1}`,
    type: 'theme',
    label: `Theme ${i + 1}`,
    visible: true,
    settings: { placement: 'top-right', initialThemeMode: 'auto' },
  }),
  editorSections: [
    {
      title: 'Theme',
      fields: [
        { key: 'placement', label: 'Placement', type: 'select', selectOptions: PLACEMENTS, defaultValue: 'top-right' },
        {
          key: 'initialThemeMode',
          label: 'Initial theme',
          type: 'select',
          defaultValue: 'auto',
          selectOptions: [
            { label: 'Auto (browser)', value: 'auto' },
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
          ],
        },
        { key: 'lightModeLabel', label: 'Light mode tooltip', type: 'string', defaultValue: 'Light mode' },
        { key: 'darkModeLabel', label: 'Dark mode tooltip', type: 'string', defaultValue: 'Dark mode' },
      ],
    },
  ],
  createWidget: (config) => new ThemeWidget({ id: config.id, ...config.settings }),
};
