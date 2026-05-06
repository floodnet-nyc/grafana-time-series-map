import type { Configuration } from 'webpack';
import grafanaConfig from './.config/webpack/webpack.config.ts';

export default grafanaConfig satisfies (env: unknown) => Promise<Configuration>;