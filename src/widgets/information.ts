import { ContextMenuWidget, InfoWidget, PopupWidget } from '@deck.gl/widgets';
import type { ContextMenuWidgetConfig, InfoWidgetConfig, PopupWidgetConfig, WidgetDefinition } from './types';

export const contextMenuWidgetDefinition: WidgetDefinition<ContextMenuWidgetConfig> = {
  type: 'context-menu',
  label: 'Context Menu',
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
