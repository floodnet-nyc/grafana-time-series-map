import { 
  ContextMenuWidget, 
  InfoWidget, 
  PopupWidget,
  type ContextMenuWidgetProps,
  type InfoWidgetProps,
  type PopupWidgetProps,
} from '@deck.gl/widgets';
import { PLACEMENTS, type BaseWidgetConfig, type WidgetDefinition } from './types';
import { WelcomeWidget, WelcomeWidgetProps } from './welcome-widget';

type ContextMenuWidgetConfig = BaseWidgetConfig<'context-menu', Omit<ContextMenuWidgetProps, 'id'>>;
type InfoWidgetConfig = BaseWidgetConfig<'info', Omit<InfoWidgetProps, 'id'>>;
type PopupWidgetConfig = BaseWidgetConfig<'popup', Omit<PopupWidgetProps, 'id'>>;
type WelcomeWidgetConfig = BaseWidgetConfig<'welcome', Omit<WelcomeWidgetProps, 'id' | 'template'> & { templateHtml: string }>;

export const contextMenuWidgetDefinition: WidgetDefinition<ContextMenuWidgetConfig> = {
  type: 'context-menu',
  label: 'Context Menu',
  description: 'Add a right-click context menu for map interactions.',
  createDefaultConfig: (i) => ({
    id: `widget-context-menu-${i + 1}`,
    type: 'context-menu',
    label: `Context Menu ${i + 1}`,
    visible: true,
    settings: { menuItems: [] },
  }),
  editorSections: [],
  createWidget: (config) => new ContextMenuWidget({ id: config.id, ...config.settings }),
};

export const infoWidgetDefinition: WidgetDefinition<InfoWidgetConfig> = {
  type: 'info',
  label: 'Info',
  description: 'Display contextual feature information on hover or click.',
  createDefaultConfig: (i) => ({
    id: `widget-info-${i + 1}`,
    type: 'info',
    label: `Info ${i + 1}`,
    visible: true,
    settings: { mode: 'hover' },
  }),
  editorSections: [
    {
      title: 'Info',
      fields: [
        {
          key: 'mode',
          label: 'Trigger',
          type: 'select',
          selectOptions: [{ label: 'Hover', value: 'hover' }, { label: 'Click', value: 'click' }],
          defaultValue: 'hover',
        },
      ],
    },
  ],
  createWidget: (config) => new InfoWidget({ id: config.id, ...config.settings }),
};

export const popupWidgetDefinition: WidgetDefinition<PopupWidgetConfig> = {
  type: 'popup',
  label: 'Popup',
  description: 'Show popup content anchored to a map position.',
  createDefaultConfig: (i) => ({
    id: `widget-popup-${i + 1}`,
    type: 'popup',
    label: `Popup ${i + 1}`,
    visible: true,
    settings: { content: '', position: [0, 0] },
  }),
  editorSections: [
    {
      title: 'Popup',
      fields: [
        { key: 'closeButton', label: 'Close button', type: 'boolean', defaultValue: true },
        { key: 'closeOnClickOutside', label: 'Close on click outside', type: 'boolean', defaultValue: false },
        { key: 'defaultIsOpen', label: 'Open by default', type: 'boolean', defaultValue: true },
      ],
    },
  ],
  createWidget: (config) => new PopupWidget({ id: config.id, ...config.settings }),
};


export const welcomeWidgetDefinition: WidgetDefinition<WelcomeWidgetConfig> = {
  type: 'welcome',
  label: 'Welcome',
  description: 'Show a welcome panel with help text to orient users.',
  createDefaultConfig: (i) => ({
    id: `widget-welcome-${i + 1}`,
    type: 'welcome',
    label: `Welcome ${i + 1}`,
    visible: true,
    settings: { placement: 'top-left', label: 'Help', title: '', templateHtml: '' },
  }),
  editorSections: [
    {
      title: 'Welcome',
      fields: [
        { key: 'placement', label: 'Placement', type: 'select', selectOptions: PLACEMENTS, defaultValue: 'top-left' },
        { key: 'label', label: 'Tooltip', type: 'string', defaultValue: 'Help' },
        { key: 'title', label: 'Panel title', type: 'string', defaultValue: '' },
        { key: 'templateHtml', label: 'HTML content', type: 'string', defaultValue: '' },
      ],
    },
  ],
  createWidget: (config) => {
    return new WelcomeWidget({
      id: config.id,
      ...config.settings,
      template: config.settings.templateHtml,
    });
  },
};
