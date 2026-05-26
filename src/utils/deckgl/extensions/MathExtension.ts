import { LayerExtension, type Layer, type LayerContext, type Accessor } from '@deck.gl/core';
// import {deepEqual} from '../utils/deep-equal';
// import { deepEqual } from '@deck.gl/core/utils/deep-equal';
import type { VariableShaderType } from '@luma.gl/core';

export type MathExtensionProps<DataT = any> = {
  getCategoryIndex?: Accessor<DataT, number>;
};

type GlslType = 'float' | 'vec2' | 'vec3' | 'vec4' | 'int' | 'ivec2' | 'ivec3' | 'ivec4' | 'mat2' | 'mat3' | 'mat4';
type UniformValue = number | number[] | number[][] | Float32Array | Float64Array;
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
  inject?: Record<string, string>; // | ((ext: any) => Record<string, string>);
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
  (type === 'int' ? 'flat ' : '') + `${inout} ${type} ${name}${length && length > 1 ? `[${length}]` : ''};`;

export class MathExtension extends LayerExtension<MathExtensionOptions & { name: string }> {
  static extensionName = 'MathExtension';
  defaultProps: MathExtensionDefaultProps = {};

  constructor(opts: MathExtensionOptions) {
    opts.name = (opts.name || 'mathext').replace(/[\s-]+/g, '_');
    super(opts as MathExtensionOptions & { name: string });

    const defaultProps = Object.entries(this.opts.attrs || {}).reduce((acc, [attr]) => {
      acc[`get${capitalizeFirstLetter(attr)}`] = { type: 'accessor' as const, value: null };
      return acc;
    }, {} as MathExtensionDefaultProps);

    this.defaultProps = { ...this.defaultProps, ...defaultProps };
  }

  /** Two MathExtensions are equal if they produce the same shader — uniform values
   *  are runtime data passed via draw() and do not affect shader compilation. */
  equals(extension: MathExtension): boolean {
    if (this === extension) {
      return true;
    }
    if (this.constructor !== extension.constructor) {
      return false;
    }
    const a = this.opts;
    const b = extension.opts;
    return (
      a.name === b.name &&
      a.noUniformBlock === b.noUniformBlock &&
      a.vs === b.vs &&
      a.fs === b.fs &&
      _injectEqual(a.inject, b.inject) &&
      _attrsEqual(a.attrs, b.attrs) &&
      _uniformStructEqual(a.uniforms, b.uniforms)
    );
  }

  getShaders(this: Layer<MathExtensionProps>, extension: this) {
    const name = extension.opts.name || 'dictEncoding';
    const attrs = extension.opts.attrs || {};
    const uniforms: MathExtensionOptions['uniforms'] = extension.opts.uniforms || {};
    const inject = extension.opts.inject || {};

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
      uniformBlock = uniformDefs ? `uniform ${name}Uniforms {\n${uniformDefs}\n} ${name};` : '';
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
      // noUniformBlock: plain GLSL uniforms — no UBO, so uniformTypes must be empty.
      // With uniformTypes set, luma.gl tries to find a UBO named `${name}Uniforms`
      // in the shader layout and fails. Plain gl.uniform* calls are used instead.
      uniformTypes: extension.opts.noUniformBlock
        ? {}
        : Object.fromEntries(Object.entries(uniforms || {}).map(([n, val]) => [n, val.utype])),
    };
    // console.log(module);

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

// ── equals() helpers — compare shader structure, ignore runtime uniform values ──

function _injectEqual(a: MathExtensionOptions['inject'], b: MathExtensionOptions['inject']): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  const keysA = Object.keys(a);
  if (keysA.length !== Object.keys(b).length) {
    return false;
  }
  return keysA.every((k) => a[k] === b[k]);
}

function _attrsEqual(a: MathExtensionOptions['attrs'], b: MathExtensionOptions['attrs']): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return a === b;
  }
  const keysA = Object.keys(a);
  if (keysA.length !== Object.keys(b).length) {
    return false;
  }
  return keysA.every((k) => a[k]?.type === b[k]?.type);
}

function _uniformStructEqual(a: MathExtensionOptions['uniforms'], b: MathExtensionOptions['uniforms']): boolean {
  if (a === b) {
    return true;
  }
  const keysA = Object.keys(a);
  if (keysA.length !== Object.keys(b).length) {
    return false;
  }
  // Compare declaration-relevant fields only; `value` is runtime data.
  return keysA.every((k) => a[k]?.type === b[k]?.type && a[k]?.length === b[k]?.length);
}

function fromUniformValues(
  values: Record<string, Uniform['value']>,
  uniforms: Record<string, Uniform>
): Record<string, Uniform> {
  return Object.keys(uniforms).reduce(
    (acc, k) => {
      const v = values[k];
      const u = uniforms[k];
      acc[k] = { ...u, value: v === undefined ? u.value : v };
      return acc;
    },
    {} as Record<string, Uniform>
  );
}

export const CreateMathExtensionSubclass = (options: MathExtensionOptions) => {
  const defaultProps = Object.entries(options.attrs || {}).reduce((acc, [attr, { value }]) => {
    acc[`get${capitalizeFirstLetter(attr)}`] = { type: 'accessor' as const, value: value ?? null };
    return acc;
  }, {} as MathExtensionDefaultProps);

  const SubMathExtension = class extends MathExtension {
    static extensionName = options.name || 'SubMathExtension';
    defaultProps = defaultProps;
    constructor({
      name,
      uniforms,
      inject,
    }: {
      name?: string;
      uniforms: Record<string, Uniform['value']>;
      inject?: Record<string, string>;
    }) {
      // options.name = name || SubMathExtension.extensionName;
      // for (const n of Object.keys(options.uniforms)) {
      //   if (uniforms[n] !== undefined) options.uniforms[n].value = uniforms[n] as Uniform['value'];
      // }
      // super(options);
      super({
        ...options,
        name: name || SubMathExtension.extensionName,
        uniforms: fromUniformValues(uniforms, options.uniforms),
        inject: inject || options.inject,
      });
    }
  };
  return SubMathExtension;
};
