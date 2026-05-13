import type { LayerCollisionConfig, LayerExtensionDefinition } from '../types';
import CollisionFilterExtension from '../../../utils/deckgl/collisionFilterFix';
import { getFeatureProperties } from '../utils';

function appendDeckExtension(layer: any, extension: unknown) {
  const props = layer.props ?? {};
  const existing = props.extensions ?? [];
  const extensionName = (extension as any).constructor?.extensionName ?? (extension as any).constructor?.name;
  const hasExtension = existing.some((item: any) => {
    const itemName = item?.constructor?.extensionName ?? item?.constructor?.name;
    return itemName === extensionName;
  });
  return hasExtension ? existing : [...existing, extension];
}

export function createDefaultCollisionConfig(): LayerCollisionConfig {
  return {
    enabled: false,
    group: '',
    priorityField: '',
    priorityScale: 1,
    priorityOffset: 0,
    testScale: 1,
  };
}

export const collisionExtensionDefinition: LayerExtensionDefinition = {
  id: 'collision',
  createDefaults: createDefaultCollisionConfig,
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
    const options = config.extensions?.collision;
    if (!options?.enabled) {
      return layer;
    }

    const props = (layer as any).props ?? {};

    return layer.clone({
      collisionEnabled: true,
      collisionGroup: String(options.group || config.id),
      collisionTestProps: {
        ...(props.collisionTestProps ?? {}),
        radiusScale: options.testScale,
        sizeScale: options.testScale,
      },
      getCollisionPriority: options.priorityField
        ? (datum: any) =>
            Number(getFeatureProperties(datum)[options.priorityField] ?? 0) * options.priorityScale + options.priorityOffset
        : options.priorityOffset,
      extensions: appendDeckExtension(layer, new CollisionFilterExtension()),
      updateTriggers: {
        ...(props.updateTriggers ?? {}),
        getCollisionPriority: [options.priorityField, options.priorityScale, options.priorityOffset],
      },
    } as any);
  },
};
