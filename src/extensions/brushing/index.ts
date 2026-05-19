import type { LayerExtensionDefinition } from '../types';
import { BrushingExtension } from '@deck.gl/extensions';
import { appendDeckExtension } from '../utils';

export interface LayerBrushingConfig {
  enabled: boolean;
  brushingRadius: number;
  brushingTarget: 'source' | 'target' | 'source_target' | 'custom';
}

export const brushingExtensionDefinition: LayerExtensionDefinition<LayerBrushingConfig> = {
  id: 'brushing',
  label: 'Brushing',
  createDefaults: () => {
    return {
      enabled: false,
      brushingRadius: 100000,
      brushingTarget: 'source',
    };
  },
  editorSections: [
    {
      title: 'Brushing',
      fields: [
        { key: 'enabled', label: 'Enable brushing', type: 'boolean', defaultValue: false },
        { key: 'brushingRadius', label: 'Brushing radius', type: 'number', defaultValue: 100000 },
        { key: 'brushingTarget', label: 'Brushing target', type: 'select', defaultValue: 'source', selectOptions: [
          { label: 'Source', value: 'source' },
          { label: 'Target', value: 'target' },
          { label: 'Source and Target', value: 'source_target' },
        ] }
      ],
    },
  ],
  apply(layer, config) {
    if (!config.enabled) {
      return layer;
    }

    return layer.clone({
      brushingEnabled: true,
      brushingRadius: Number(config.brushingRadius),
      brushingTarget: config.brushingTarget,
      extensions: appendDeckExtension(layer, new BrushingExtension()),
    } as any);
  },
};
