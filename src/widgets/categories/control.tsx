import {
  IconWidget,
  ToggleWidget,
  SelectorWidget,
  _TimelineWidget as TimelineWidget,
  type IconWidgetProps,
  type ToggleWidgetProps,
  type SelectorWidgetProps,
  type TimelineWidgetProps,
} from '@deck.gl/widgets';
import { PLACEMENTS, type BaseWidgetConfig, type WidgetCallbacks, type WidgetDefinition } from '../types';

type IconWidgetConfig = BaseWidgetConfig<'icon', Omit<IconWidgetProps, 'id'>>;
type ToggleWidgetConfig = BaseWidgetConfig<'toggle', Omit<ToggleWidgetProps, 'id'>>;
type SelectorWidgetConfig = BaseWidgetConfig<'selector', Omit<SelectorWidgetProps, 'id'>>;
type TimelineWidgetConfig = BaseWidgetConfig<'timeline', Omit<TimelineWidgetProps, 'id'>>;

// USE: Welcome popup? - add template
export const iconWidgetDefinition: WidgetDefinition<IconWidgetConfig> = {
  type: 'icon',
  label: 'Icon',
  description: 'Add a clickable icon button to the map UI.',
  createDefaultConfig: (i) => ({
    id: `widget-icon-${i + 1}`,
    type: 'icon',
    label: `Icon ${i + 1}`,
    visible: true,
    settings: { placement: 'bottom-right', icon: '' },
  }),
  editorSections: [
    {
      title: 'Icon',
      fields: [
        { key: 'placement', label: 'Placement', type: 'select', selectOptions: PLACEMENTS, defaultValue: 'bottom-right' },
        { key: 'icon', label: 'Icon (data URL or SVG)', type: 'string', defaultValue: '' },
        // { key: 'label', label: 'Tooltip', type: 'string', defaultValue: '' },
        { key: 'color', label: 'Color', type: 'color', defaultValue: '' },
      ],
    },
  ],
  createWidget: (config) => new IconWidget({ id: config.id, ...config.settings }),
};

// DISABLE
export const toggleWidgetDefinition: WidgetDefinition<ToggleWidgetConfig> = {
  type: 'toggle',
  label: 'Toggle',
  description: 'Add a toggle button with checked and unchecked states.',
  createDefaultConfig: (i) => ({
    id: `widget-toggle-${i + 1}`,
    type: 'toggle',
    label: `Toggle ${i + 1}`,
    visible: true,
    settings: { placement: 'bottom-right', icon: '' },
  }),
  editorSections: [
    {
      title: 'Toggle',
      fields: [
        { key: 'placement', label: 'Placement', type: 'select', selectOptions: PLACEMENTS, defaultValue: 'bottom-right' },
        { key: 'icon', label: 'Icon (data URL or SVG)', type: 'string', defaultValue: '' },
        { key: 'onIcon', label: 'Checked icon', type: 'string', defaultValue: '' },
        // { key: 'label', label: 'Tooltip', type: 'string', defaultValue: '' },
        // { key: 'onLabel', label: 'Checked tooltip', type: 'string', defaultValue: '' },
        { key: 'color', label: 'Color', type: 'color', defaultValue: '' },
        { key: 'onColor', label: 'Checked color', type: 'color', defaultValue: '' },
        { key: 'initialChecked', label: 'Initially checked', type: 'boolean', defaultValue: false },
      ],
    },
  ],
  createWidget: (config) => new ToggleWidget({ id: config.id, ...config.settings }),
};

// DISABLE
export const selectorWidgetDefinition: WidgetDefinition<SelectorWidgetConfig> = {
  type: 'selector',
  label: 'Selector',
  description: 'Add a selector control for choosing from multiple options.',
  createDefaultConfig: (i) => ({
    id: `widget-selector-${i + 1}`,
    type: 'selector',
    label: `Selector ${i + 1}`,
    visible: true,
    settings: { placement: 'top-left', options: [] },
  }),
  editorSections: [
    {
      title: 'Selector',
      fields: [
        { key: 'placement', label: 'Placement', type: 'select', selectOptions: PLACEMENTS, defaultValue: 'top-left' },
      ],
    },
  ],
  createWidget: (config) => new SelectorWidget({ id: config.id, ...config.settings }),
};

export const timelineWidgetDefinition: WidgetDefinition<TimelineWidgetConfig> = {
  type: 'timeline',
  label: 'Timeline',
  description: 'Add a timeline scrubber with optional playback controls.',
  createDefaultConfig: (i) => ({
    id: `widget-timeline-${i + 1}`,
    type: 'timeline',
    label: `Timeline ${i + 1}`,
    visible: true,
    settings: { placement: 'bottom-left', timeRange: [0, 100], step: 1, autoPlay: false, loop: false, playInterval: 1000 },
  }),
  editorSections: [
    {
      title: 'Timeline',
      fields: [
        { key: 'placement', label: 'Placement', type: 'select', selectOptions: PLACEMENTS, defaultValue: 'bottom-left' },
        { key: 'autoPlay', label: 'Auto play', type: 'boolean', defaultValue: false },
        { key: 'loop', label: 'Loop', type: 'boolean', defaultValue: false },
        { key: 'playInterval', label: 'Play interval (ms)', type: 'number', defaultValue: 1000 },
        { key: 'step', label: 'Step', type: 'number', defaultValue: 1 },
      ],
    },
  ],
  createWidget: (config, callbacks?: WidgetCallbacks) =>
    new TimelineWidget({
      id: config.id,
      ...config.settings,
      timeRange: callbacks?.playback?.timeRange,
      time: callbacks?.playback?.cursorTimeMs,
      playing: callbacks?.playback?.playing,
      playInterval: callbacks?.playback?.playInterval,
      onPlayingChange: callbacks?.playback?.onPlayingChange,
      onTimeChange: callbacks?.playback?.onSeekTo,
      formatLabel: callbacks?.playback?.formatLabel,
    }),
};
