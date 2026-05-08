import CollisionFilterExtension from '../../../utils/deckgl/collisionFilterFix';
import { appendDeckExtension, registerLayerExtension } from '../registry';
import { getFeatureProperties, numericOption } from '../utils';

registerLayerExtension({
  id: 'collision',
  defaultOptions: {
    collisionEnabled: false,
    collisionGroup: '',
    collisionPriorityField: '',
    collisionPriorityScale: 1,
    collisionPriorityOffset: 0,
    collisionTestScale: 1,
  },
  optionsSchema: [
    { key: 'collisionEnabled', label: 'Enable collision filtering', type: 'boolean', defaultValue: false, section: 'Collision' },
    { key: 'collisionGroup', label: 'Collision group', type: 'string', defaultValue: '', section: 'Collision' },
    { key: 'collisionPriorityField', label: 'Priority field', type: 'fieldPicker', defaultValue: '', section: 'Collision' },
    { key: 'collisionPriorityScale', label: 'Priority scale', type: 'number', defaultValue: 1, section: 'Collision' },
    { key: 'collisionPriorityOffset', label: 'Priority offset', type: 'number', defaultValue: 0, section: 'Collision' },
    { key: 'collisionTestScale', label: 'Collision test scale', type: 'number', defaultValue: 1, section: 'Collision' },
  ],
  apply(layer, config) {
    const options = config.options ?? {};
    if (!Boolean(options.collisionEnabled)) {
      return layer;
    }

    const priorityField = String(options.collisionPriorityField ?? '');
    const priorityScale = numericOption(options, 'collisionPriorityScale', 1);
    const priorityOffset = numericOption(options, 'collisionPriorityOffset', 0);
    const testScale = numericOption(options, 'collisionTestScale', 1);
    const props = (layer as any).props ?? {};

    return layer.clone({
      collisionEnabled: true,
      collisionGroup: String(options.collisionGroup || config.id),
      collisionTestProps: {
        ...(props.collisionTestProps ?? {}),
        radiusScale: testScale,
        sizeScale: testScale,
      },
      getCollisionPriority: priorityField
        ? (datum: any) => Number(getFeatureProperties(datum)[priorityField] ?? 0) * priorityScale + priorityOffset
        : priorityOffset,
      extensions: appendDeckExtension(layer, new CollisionFilterExtension()),
      updateTriggers: {
        ...(props.updateTriggers ?? {}),
        getCollisionPriority: [priorityField, priorityScale, priorityOffset],
      },
    } as any);
  },
});
