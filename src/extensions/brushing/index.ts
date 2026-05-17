import type { LayerExtensionDefinition } from '../types';
import { BrushingExtension } from '@deck.gl/extensions';
import { appendDeckExtension } from '../utils';

export interface LayerBrushingConfig {
  enabled: boolean;
  brushingRadius: number;
}

export const brushingExtensionDefinition: LayerExtensionDefinition<LayerBrushingConfig> = {
  id: 'brushing',
  label: 'Brushing',
  createDefaults: () => {
    return {
      enabled: false,
      brushingRadius: 100000,
    };
  },
  editorSections: [
    {
      title: 'Brushing',
      fields: [
        { key: 'enabled', label: 'Enable brushing', type: 'boolean', defaultValue: false },
        { key: 'brushingRadius', label: 'Brushing radius', type: 'number', defaultValue: 100000 },
      ],
    },
  ],
  apply(layer, config) {
    if (!config.enabled) {
      return layer;
    }

    return layer.clone({
      brushingEnabled: true,
      brushingRadius: String(config.brushingRadius),
      extensions: appendDeckExtension(layer, new BrushingExtension()),
    } as any);
  },
};
