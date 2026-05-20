import { MathExtension } from '../../utils/deckgl/extensions/MathExtension';

export const CURRENT_LOCATION_EFFECT_RADIUS = 31;

const BLUE_RGB = 'vec3(0.2, 0.53333336, 1.0)';

export class CurrentLocationPulseExtension extends MathExtension {
  static extensionName = 'CurrentLocationPulseExtension';

  constructor() {
    super({
      name: 'currentLocationPulse',
      noUniformBlock: true,
      uniforms: {},
      inject: {
        'fs:DECKGL_FILTER_COLOR': `
float currentLocationDistPx = length(geometry.uv) * 31.0;
float currentLocationHalo = smoothstep(
  12.0,
  0.0,
  currentLocationDistPx
) * 0.28;
float currentLocationRing = smoothstep(
  2.5,
  0.0,
  abs(currentLocationDistPx - 20.0)
) * 0.75;
color.rgb = ${BLUE_RGB};
color.a = max(currentLocationHalo, currentLocationRing);
        `.trim(),
      },
    });
  }
}
