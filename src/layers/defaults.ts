import type { GeometrySource, LayerExtensionsConfig } from '../types';
import type { BaseLayerConfig, LayerConfig, LayerType, LayerEditorSection, LayerOptionField } from './types';
import {
  createDefaultBlendingConfig,
} from './extensions/blending';
import { createDefaultCollisionConfig } from './extensions/collision';
import { createDefaultMaterialConfig } from './extensions/material';

export function createDefaultLayerExtensions(): LayerExtensionsConfig {
  return {
    blending: createDefaultBlendingConfig(),
    collision: createDefaultCollisionConfig(),
    material: createDefaultMaterialConfig(),
  };
}

export function createBaseLayerConfig<TType extends LayerType, TSettings>(
  type: TType,
  label: string,
  index: number,
  settings: TSettings,
  geometry: GeometrySource = { type: 'wkb', field: 'geom' },
): BaseLayerConfig<TType, TSettings> {
  return {
    id: `layer-${type}-${index + 1}`,
    type,
    label: `${label} ${index + 1}`,
    visible: true,
    queryRefId: undefined,
    geometry,
    timeFilter: { mode: 'none', timeField: 'time' },
    fieldMappings: [],
    opacity: 1,
    settings,
    extensions: createDefaultLayerExtensions(),
  };
}

export function section(title: string, fields: LayerOptionField[]): LayerEditorSection {
  return { title, fields };
}
