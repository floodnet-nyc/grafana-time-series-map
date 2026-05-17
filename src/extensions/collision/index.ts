import type { LayerExtensionDefinition } from '../types';
import CollisionFilterExtension from 'utils/deckgl/collisionFilterFix';
import { getFeatureProperties, getLayerProps, appendDeckExtension } from '../utils';

export interface LayerCollisionConfig {
  enabled: boolean;
  group: string;
  priorityField: string;
  priorityScale: number;
  priorityOffset: number;
  testScale: number;
}


export const collisionExtensionDefinition: LayerExtensionDefinition<LayerCollisionConfig> = {
  id: 'collision',
  label: 'Collision',
  createDefaults: () => {
    return {
      enabled: false,
      group: '',
      priorityField: '',
      priorityScale: 1,
      priorityOffset: 0,
      testScale: 1,
    };
  },
  editorSections: [
    {
      title: 'Collision',
      fields: [
        { key: 'enabled', label: 'Enable collision filtering', type: 'boolean', defaultValue: false },
        { key: 'group', label: 'Collision group', type: 'string', defaultValue: '' },
        { key: 'priorityField', label: 'Priority field', type: 'fieldPicker', defaultValue: '' },
        { key: 'priorityScale', label: 'Priority scale', type: 'number', defaultValue: 1 },
        { key: 'priorityOffset', label: 'Priority offset', type: 'number', defaultValue: 0 },
        { key: 'testScale', label: 'Collision test scale', type: 'number', defaultValue: 1 },
      ],
    },
  ],
  apply(layer, config) {
    if (!config.enabled) {
      return layer;
    }

    const props = getLayerProps(layer);

    return layer.clone({
      collisionEnabled: true,
      collisionGroup: String(config.group),
      collisionTestProps: {
        ...(props.collisionTestProps ?? {}),
        radiusScale: config.testScale,
        sizeScale: config.testScale,
      },
      getCollisionPriority: config.priorityField
        ? (datum: any) =>
            Number(getFeatureProperties(datum)[config.priorityField] ?? 0) * config.priorityScale + config.priorityOffset
        : config.priorityOffset,
      extensions: appendDeckExtension(layer, new CollisionFilterExtension()),
      updateTriggers: {
        ...(props.updateTriggers ?? {}),
        getCollisionPriority: [config.priorityField, config.priorityScale, config.priorityOffset],
      },
    } as any);
  },
};
