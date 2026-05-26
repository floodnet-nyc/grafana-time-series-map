import { useEffect, useMemo, useState } from 'react';
import {
  getLayerDefinition,
  hasAsyncLayerDefinition,
  loadLayerDefinition,
  type AnyLayerDefinition,
  type LayerConfig,
} from '../layers';

type LoadedLayerDefinitions = Partial<Record<string, AnyLayerDefinition>>;

export function useLayerRenderers(layerConfigs: LayerConfig[]) {
  const [loadedDefinitions, setLoadedDefinitions] = useState<LoadedLayerDefinitions>({});

  const asyncTypes = useMemo(
    () => Array.from(new Set(layerConfigs.map((layer) => layer.type).filter(hasAsyncLayerDefinition))),
    [layerConfigs]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadDefinitions() {
      const missingTypes = asyncTypes.filter((type) => !loadedDefinitions[type]);
      if (missingTypes.length === 0) {
        return;
      }

      const resolvedDefinitions = await Promise.all(missingTypes.map((type) => loadLayerDefinition(type)));
      if (cancelled) {
        return;
      }

      setLoadedDefinitions((current) => {
        const next = { ...current };
        for (const definition of resolvedDefinitions) {
          if (definition) {
            next[definition.type] = definition;
          }
        }
        return next;
      });
    }

    void loadDefinitions();

    return () => {
      cancelled = true;
    };
  }, [asyncTypes, loadedDefinitions]);

  return useMemo(
    () => (type: string) => loadedDefinitions[type] ?? getLayerDefinition(type),
    [loadedDefinitions]
  );
}
