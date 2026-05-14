import { DEFAULT_DECK_LIGHTING, buildDeckEffects } from './lighting';

describe('deck lighting helpers', () => {
  it('stores default light colors as numeric RGB arrays', () => {
    expect(DEFAULT_DECK_LIGHTING.lights[0].color).toEqual([255, 255, 255]);
  });

  it('builds effects for RGB array light colors', () => {
    const effects = buildDeckEffects({
      enabled: true,
      lights: [{ id: 'ambient-1', type: 'ambient', color: [10, 20, 30], intensity: 1 }],
    });

    expect(effects).toHaveLength(1);
  });

  it('keeps backward compatibility with legacy string light colors', () => {
    const effects = buildDeckEffects({
      enabled: true,
      lights: [{ id: 'ambient-1', type: 'ambient', color: '10,20,30' as any, intensity: 1 }],
    });

    expect(effects).toHaveLength(1);
  });
});
