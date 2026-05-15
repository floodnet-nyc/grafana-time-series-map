import type { Configuration } from 'webpack';
import grafanaConfig from './.config/webpack/webpack.config.ts';

export default async (env: unknown): Promise<Configuration> => {
  const config = await (grafanaConfig as (env: unknown) => Promise<Configuration>)(env);
  return {
    ...config,
    output: {
      ...config.output,
      // Required for @developmentseed/geotiff pool worker: webpack's chunk
      // runtime uses the globalObject reference, which must be 'self' (not
      // 'window') so it works inside Web Workers.
      globalObject: 'self',
    },
    module: {
      ...config.module,
      rules: [
        ...((config.module?.rules as any[]) ?? []),
        // @deck.gl/widgets declares sideEffects:false which causes webpack to
        // tree-shake the stylesheet.css import. Override it for this package.
        {
          test: /\.css$/,
          include: /node_modules\/@deck\.gl\/widgets/,
          sideEffects: true,
        },
      ],
    },
  };
};
