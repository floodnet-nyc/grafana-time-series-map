import type { GeometrySource, SourceRef } from '../types';
import type { BaseLayerConfig, LayerEditorSection, LayerOptionField } from './types';

export const DEFAULT_FEATURE_SOURCE_ID = 'main';

export function createSourceRef(field = '', source = DEFAULT_FEATURE_SOURCE_ID): SourceRef {
  return { source, field };
}

export function createBaseLayerConfig<TType extends string, TSettings>(
  type: TType,
  label: string,
  index: number,
  settings: TSettings,
  geometry: GeometrySource = { type: 'wkb', value: createSourceRef('geom') },
): BaseLayerConfig<TType, TSettings> {
  return {
    id: `layer-${type}-${index + 1}`,
    type,
    label: `${label} ${index + 1}`,
    visible: true,
    data: {
      featureSource: {
        id: DEFAULT_FEATURE_SOURCE_ID,
        refId: '',
      },
    },
    geometry,
    timeFilter: { mode: 'none', time: createSourceRef('time') },
    opacity: 1,
    settings,
    extensions: [],
  };
}

export function section(title: string, fields: LayerOptionField[]): LayerEditorSection {
  return { title, fields };
}
