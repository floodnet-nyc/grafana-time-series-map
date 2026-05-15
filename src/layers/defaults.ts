import type { GeometrySource } from '../types';
import type { BaseLayerConfig, LayerEditorSection, LayerOptionField } from './types';
import { createDefaultLayerExtensions } from './extensions';


export function createBaseLayerConfig<TType extends string, TSettings>(
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
