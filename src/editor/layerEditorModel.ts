import type { LayerConfig, LayerOptionField } from '../layers/types';
import type { ColorScaleConfig, ColorStep, ShaderConfig } from '../types';

export const ADVANCED_COLOR_SECTIONS = new Set(['Blending', 'Material']);

export const DEFAULT_THRESHOLD_STEPS: ColorStep[] = [
  { value: 0, color: [0, 155, 104, 255] },
  { value: 4, color: [0, 204, 255, 255] },
  { value: 12, color: [253, 191, 75, 255] },
  { value: 24, color: [254, 77, 76, 255] },
  { value: 48, color: [215, 77, 254, 255] },
];

export function groupOptionsBySection(fields: LayerOptionField[]): Map<string | undefined, LayerOptionField[]> {
  const sections = new Map<string | undefined, LayerOptionField[]>();

  for (const field of fields) {
    const section = field.section;
    if (!sections.has(section)) {
      sections.set(section, []);
    }
    sections.get(section)!.push(field);
  }

  return sections;
}

export function splitOptionSections(optionsBySections: Map<string | undefined, LayerOptionField[]>) {
  const entries = Array.from(optionsBySections.entries());
  return {
    regular: entries.filter(([section]) => !ADVANCED_COLOR_SECTIONS.has(section ?? '')),
    advancedColor: entries.filter(([section]) => ADVANCED_COLOR_SECTIONS.has(section ?? '')),
  };
}

export function getColorMode(layer: LayerConfig): 'fixed' | 'threshold' | 'gradient' {
  if (!layer.colorScale || layer.colorScale.type === 'fixed') {
    return 'fixed';
  }
  if (layer.colorScale.type === 'threshold') {
    return 'threshold';
  }
  return 'gradient';
}

export function getActiveScheme(layer: LayerConfig): string {
  return layer.colorScale?.schemeName ?? '';
}

export function createColorModePatch(
  mode: 'fixed' | 'threshold' | 'gradient',
  layer: LayerConfig,
  defaultVsFilterColor: string
): Pick<LayerConfig, 'colorScale' | 'shader'> {
  const valueField = layer.colorScale?.field ?? '';

  if (mode === 'fixed') {
    return {
      colorScale: { type: 'fixed', fixedColor: [0, 155, 104, 255] },
      shader: layer.shader,
    };
  }

  if (mode === 'threshold') {
    return {
      colorScale: {
        type: 'threshold',
        field: valueField,
        steps: DEFAULT_THRESHOLD_STEPS,
      },
      shader: {
        enabled: true,
        valueField,
        vsDecl: '',
        vsFilterColor: defaultVsFilterColor,
      },
    };
  }

  return {
    colorScale: {
      type: 'gradient',
      schemeName: 'FloodDepth',
      scaleMin: 0,
      scaleMax: 40,
      field: valueField,
    },
    shader: {
      enabled: true,
      valueField,
      vsDecl: '',
      vsFilterColor: defaultVsFilterColor,
    },
  };
}

export function patchThresholdStep(
  steps: ColorStep[],
  index: number,
  updates: Partial<ColorStep>
): ColorStep[] {
  return steps.map((step, stepIndex) => (stepIndex === index ? { ...step, ...updates } : step));
}

export function removeThresholdStep(steps: ColorStep[], index: number): ColorStep[] {
  return steps.filter((_, stepIndex) => stepIndex !== index);
}

export function appendThresholdStep(steps: ColorStep[]): ColorStep[] {
  const last = steps[steps.length - 1];
  return [...steps, { value: (last?.value ?? 0) + 10, color: [200, 200, 200, 255] }];
}

export function createPatchedShader(
  shader: ShaderConfig | undefined,
  updates: Partial<ShaderConfig>
): ShaderConfig {
  return { enabled: false, valueField: '', ...shader, ...updates };
}

export function createPatchedColorScale(
  colorScale: ColorScaleConfig | undefined,
  updates: Partial<ColorScaleConfig>
): ColorScaleConfig {
  return { type: 'fixed', ...colorScale, ...updates };
}
