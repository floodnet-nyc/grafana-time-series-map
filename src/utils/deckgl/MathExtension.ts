import type { Layer, LayerContext, Accessor } from '@deck.gl/core';
import { LayerExtension } from '@deck.gl/core';
import type { VariableShaderType } from '@luma.gl/core';

export type MathExtensionProps<DataT = any> = {
  getCategoryIndex?: Accessor<DataT, number>;
};

type GlslType = 'float' | 'vec2' | 'vec3' | 'vec4' | 'int' | 'ivec2' | 'ivec3' | 'ivec4' | 'mat2' | 'mat3' | 'mat4';
type UniformValue = number | number[] | number[][];
type Uniform = {
  type: GlslType;
  utype: VariableShaderType;
  value: UniformValue;
  packed?: number | Float32Array;
  length?: number;
};

type Attribute = {
  type: GlslType;
  value?: UniformValue;
};

export type MathExtensionOptions = {
  name?: string;
  attrs?: Record<string, Attribute>;
  uniforms: Record<string, Uniform>;
  inject?: Record<string, string> | ((ext: any) => Record<string, string>);
  vs?: string;
  fs?: string;
  noUniformBlock?: boolean;
};

type MathExtensionDefaultProps = Record<string, any>;

const packFloat32Array = (arr: number[][]) => {
  const flat = new Float32Array(arr.length * (arr[0]?.length === undefined ? 1 : arr[0].length || 0));
  let i = 0;
  for (const rgba of arr) {
    for (const v of Array.isArray(rgba) ? rgba : [rgba]) {
      flat[i++] = v;
    }
  }
  return flat;
};

const declaration = (inout: string, type: GlslType, name: string, length?: number) =>
  (type === 'int' ? 'flat ' : '') +
  `${inout} ${type} ${name}${length && length > 1 ? `[${length}]` : ''};`;

export class MathExtension extends LayerExtension<MathExtensionOptions & { name: string }> {
  static extensionName = 'MathExtension';
  defaultProps: MathExtensionDefaultProps = {};

  constructor(opts: MathExtensionOptions) {
    opts.name = opts.name || 'dictEncoding';
    super(opts as MathExtensionOptions & { name: string });

    const defaultProps = Object.entries(this.opts.attrs || {}).reduce((acc, [attr]) => {
      acc[`get${capitalizeFirstLetter(attr)}`] = { type: 'accessor' as const, value: null };
      return acc;
    }, {} as MathExtensionDefaultProps);

    this.defaultProps = { ...this.defaultProps, ...defaultProps };
  }

  getShaders(this: Layer<MathExtensionProps>, extension: this) {
    const name = extension.opts.name || 'dictEncoding';
    const attrs = extension.opts.attrs || {};
    const uniforms: MathExtensionOptions['uniforms'] = extension.opts.uniforms || {};
    const injectFn = extension.opts.inject || {};
    const inject = typeof injectFn === 'function' ? injectFn(extension) : injectFn;

    let uniformBlock = '';
    if (extension.opts.noUniformBlock) {
      uniformBlock = Object.entries(uniforms)
        .map(([n, val]) => declaration('uniform', val.type, n, val.length || (val.value as any)?.length))
        .join('\n')
        .trim();
    } else {
      const uniformDefs = Object.entries(uniforms)
        .map(([n, val]) => declaration('', val.type, n, val.length || (val.value as any)?.length))
        .join('\n')
        .trim();
      uniformBlock = uniformDefs
        ? `uniform ${name}Uniforms {\n${uniformDefs}\n} ${name};`
        : '';
    }

    const vertexInputs = Object.entries(attrs)
      .map(([attr, { type }]) => declaration('in', type, `instance${capitalizeFirstLetter(attr)}`))
      .join('\n')
      .trim();
    const vertexOutputs = Object.entries(attrs)
      .map(([attr, { type }]) => declaration('out', type, `vInstance${capitalizeFirstLetter(attr)}`))
      .join('\n')
      .trim();
    const vertexMainEnd = Object.entries(attrs)
      .map(([attr]) => `vInstance${capitalizeFirstLetter(attr)} = instance${capitalizeFirstLetter(attr)};`)
      .join('\n')
      .trim();
    const fragmentInputs = Object.entries(attrs)
      .map(([attr, { type }]) => declaration('in', type, `vInstance${capitalizeFirstLetter(attr)}`))
      .join('\n')
      .trim();

    const module = {
      name,
      inject: {
        ...inject,
        'vs:#decl': `${vertexInputs}\n${vertexOutputs}\n${inject['vs:#decl'] || ''}`.trim(),
        'vs:#main-end': `${vertexMainEnd}\n${inject['vs:#main-end'] || ''}`.trim(),
        'fs:#decl': `${fragmentInputs}\n${inject['fs:#decl'] || ''}`.trim(),
      },
      vs: `${uniformBlock}\n${extension.opts.vs || ''}`.trim(),
      fs: `${uniformBlock}\n${extension.opts.fs || ''}`.trim(),
      getUniforms: (opts: MathExtensionOptions['uniforms']) => {
        return Object.entries(opts || {}).reduce(
          (acc, [n, val]) => {
            if (Array.isArray(val.value)) acc[n] = packFloat32Array(val.value as number[][]);
            else acc[n] = val.value as number | number[] | Float32Array;
            return acc;
          },
          {} as Record<string, number | number[] | Float32Array>
        );
      },
      uniformTypes: Object.fromEntries(Object.entries(uniforms || {}).map(([n, val]) => [n, val.utype])),
    };

    return { modules: [module] };
  }

  initializeState(this: Layer<MathExtensionProps>, context: LayerContext, extension: this) {
    super.initializeState(context, extension);
    const attributeManager = this.getAttributeManager();
    if (!attributeManager) return;
    attributeManager.add(
      Object.entries(extension.opts.attrs || {}).reduce(
        (acc, [attr, { type: _type, ...attrOpts }]) => {
          acc[`instance${capitalizeFirstLetter(attr)}`] = {
            size: 1,
            stepMode: 'dynamic',
            accessor: `get${capitalizeFirstLetter(attr)}`,
            ...attrOpts,
          };
          return acc;
        },
        {} as Record<string, any>
      )
    );
  }

  draw(this: Layer<MathExtensionProps>, _params: any, extension: this) {
    this.setShaderModuleProps({ [`${extension.opts.name}`]: extension.opts.uniforms });
  }
}

function capitalizeFirstLetter(val: string) {
  return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

export const CreateMathExtensionSubclass = (options: MathExtensionOptions) => {
  type UniformValue2 = number | number[] | number[][];
  const defaultProps = Object.entries(options.attrs || {}).reduce((acc, [attr, { value }]) => {
    acc[`get${capitalizeFirstLetter(attr)}`] = { type: 'accessor' as const, value: value ?? null };
    return acc;
  }, {} as MathExtensionDefaultProps);

  const SubMathExtension = class extends MathExtension {
    static extensionName = options.name || 'SubMathExtension';
    defaultProps = defaultProps;
    constructor(name: string, uniforms: Record<string, UniformValue2>) {
      options.name = name || SubMathExtension.extensionName;
      for (const n of Object.keys(options.uniforms)) {
        if (uniforms[n] !== undefined) options.uniforms[n].value = uniforms[n] as UniformValue;
      }
      super(options);
    }
  };
  return SubMathExtension;
};
