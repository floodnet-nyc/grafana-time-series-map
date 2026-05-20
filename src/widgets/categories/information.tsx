import { 
  ContextMenuWidget, 
  InfoWidget, 
  PopupWidget,
  type ContextMenuWidgetProps,
  type InfoWidgetProps,
  type PopupWidgetProps,
} from '@deck.gl/widgets';
import type { Feature } from 'geojson';
import { PLACEMENTS, type BaseWidgetConfig, type WidgetDefinition } from '../types';
import { MessageWidget, MessageWidgetProps } from '../custom/message-widget';
import { StreetViewWidget, StreetViewWidgetProps } from '../custom/street-view-widget';

type ContextMenuWidgetConfig = BaseWidgetConfig<'context-menu', Omit<ContextMenuWidgetProps, 'id'>>;
type InfoWidgetConfig = BaseWidgetConfig<'info', Omit<InfoWidgetProps, 'id'>>;
type PopupWidgetConfig = BaseWidgetConfig<'popup', Omit<PopupWidgetProps, 'id'>>;
type MessageWidgetConfig = BaseWidgetConfig<'message', Omit<MessageWidgetProps, 'id' | 'template'> & { templateHtml: string }>;
type StreetViewWidgetConfig = BaseWidgetConfig<'street-view', Omit<StreetViewWidgetProps, 'id' | 'selectedFeature' | 'selectedKey' | 'provider'>>;

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
      fields: [
        { key: 'closeButton', label: 'Close button', type: 'boolean', defaultValue: true },
        { key: 'closeOnClickOutside', label: 'Close on click outside', type: 'boolean', defaultValue: false },
        { key: 'defaultIsOpen', label: 'Open by default', type: 'boolean', defaultValue: true },
      ],
    },
  ],
  createWidget: (config) => new PopupWidget({ id: config.id, ...config.settings }),
};


export const messageWidgetDefinition: WidgetDefinition<MessageWidgetConfig> = {
  type: 'message',
  label: 'Message',
  description: 'Show a message panel with help text to orient users.',
  createDefaultConfig: (i) => ({
    id: `widget-message-${i + 1}`,
    type: 'message',
    label: `Message ${i + 1}`,
    visible: true,
    settings: {
      placement: 'top-left',
      label: 'Help',
      icon: '?',
      imageUrl: '',
      defaultCollapsed: false,
      title: '',
      templateHtml: '',
    },
  }),
  editorSections: [
    {
      fields: [
        { key: 'placement', label: 'Placement', type: 'select', selectOptions: PLACEMENTS, defaultValue: 'top-left' },
        { key: 'label', label: 'Label', type: 'string', defaultValue: 'Help' },
        { key: 'icon', label: 'Icon', type: 'string', defaultValue: '?' },
        { key: 'imageUrl', label: 'Image URL', type: 'string', defaultValue: '' },
        { key: 'defaultCollapsed', label: 'Collapsed by default', type: 'boolean', defaultValue: false },
        { key: 'title', label: 'Panel title', type: 'string', defaultValue: '' },
        { key: 'templateHtml', label: 'HTML content', type: 'html', defaultValue: '' },
      ],
    },
  ],
  createWidget: (config) => {
    return new MessageWidget({
      id: config.id,
      ...config.settings,
      template: config.settings.templateHtml,
    });
  },
};

export const streetViewWidgetDefinition: WidgetDefinition<StreetViewWidgetConfig> = {
  type: 'street-view',
  label: 'Street View',
  description: 'Show Google Street View for the currently selected point feature.',
  createDefaultConfig: (i) => ({
    id: `widget-street-view-${i + 1}`,
    type: 'street-view',
    label: `Street View ${i + 1}`,
    visible: true,
    settings: {
      placement: 'bottom-right',
      label: 'Street View',
      icon: '\u25a3',
      defaultCollapsed: true,
      title: '',
      height: 240,
    },
  }),
  editorSections: [
    {
      fields: [
        { key: 'placement', label: 'Placement', type: 'select', selectOptions: PLACEMENTS, defaultValue: 'bottom-right' },
        { key: 'label', label: 'Label', type: 'string', defaultValue: 'Street View' },
        { key: 'icon', label: 'Icon', type: 'string', defaultValue: '\u25a3' },
        { key: 'defaultCollapsed', label: 'Collapsed by default', type: 'boolean', defaultValue: true },
        { key: 'title', label: 'Panel title', type: 'string', defaultValue: '' },
        { key: 'height', label: 'Panel height', type: 'number', defaultValue: 240 },
      ],
    },
  ],
  createWidget: (config, callbacks) =>
    new StreetViewWidget({
      id: config.id,
      ...config.settings,
      selectedFeature: callbacks?.selection?.feature as Feature | null | undefined,
      selectedKey: callbacks?.selection?.key,
      provider: callbacks?.provider,
    }),
};
