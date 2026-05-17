import { useEffect, useMemo, useRef, useState } from 'react';
import type { PanelData } from '@grafana/data';
import type { Layer, PickingInfo } from '@deck.gl/core';
import type { Feature } from 'geojson';
import type { MapPanelOptions } from '../types';
import type { DeckTooltipContent } from '../components/map/types';
import { buildDeckTooltip, DEFAULT_TOOLTIP_TEMPLATE } from '../extensions/tooltip';
import {
  buildSecondarySourcePackedByLayerId,
  buildSecondarySourceValuesByLayerId,
  buildPreparedLayerStates,
  buildTimeFilterFlagsByLayerId,
  buildTimePackedByLayerId,
  renderPreparedLayers,
  type PreparedLayerState,
} from '../utils/dataframe/panelLayersModel';
import { type GeoFeature, dataFramesToFeatures, geojsonToFeatures } from '../utils/dataframe/toGeoJsonFeatures';

export interface UsePanelLayersResult {
  layers: Layer[];
  getTooltip: ((info: PickingInfo) => DeckTooltipContent) | null;
  preparedLayerStates: PreparedLayerState[];
}

export function usePanelLayers(
  options: MapPanelOptions,
  featuresByLayerId: PanelFeaturesByLayerId,
  data: PanelData,
  cursorTimeMs: number,
  fromTimeMs: number,
  toTimeMs: number,
  selectedKey: string | null,
  onFeatureClick?: (feature: Feature, info: any) => void,
): UsePanelLayersResult {
  const packedByLayerId = useMemo(() => {
    return buildTimePackedByLayerId(options.layers, featuresByLayerId);
  }, [featuresByLayerId, options.layers]);

  const secondarySourcePackedByLayerId = useMemo(() => {
    return buildSecondarySourcePackedByLayerId(options.layers, data.series);
  }, [data.series, options.layers]);

  const secondarySourceValuesByLayerId = useMemo(() => {
    return buildSecondarySourceValuesByLayerId(options.layers, secondarySourcePackedByLayerId, cursorTimeMs);
  }, [cursorTimeMs, options.layers, secondarySourcePackedByLayerId]);

  const flagsByLayerId = useMemo(() => {
    return buildTimeFilterFlagsByLayerId(options.layers, featuresByLayerId, packedByLayerId, cursorTimeMs, fromTimeMs, toTimeMs);
  }, [featuresByLayerId, packedByLayerId, cursorTimeMs, fromTimeMs, toTimeMs, options.layers]);

  const preparedLayerStates = useMemo(() => {
    return buildPreparedLayerStates(options.layers, featuresByLayerId, flagsByLayerId, secondarySourceValuesByLayerId);
  }, [featuresByLayerId, flagsByLayerId, options.layers, secondarySourceValuesByLayerId]);

  const layers = useMemo(() => {
    return renderPreparedLayers({
      preparedLayerStates,
      options,
      cursorTimeMs,
      fromTimeMs,
      toTimeMs,
      selectedKey,
      onFeatureClick,
    });
  }, [preparedLayerStates, cursorTimeMs, fromTimeMs, toTimeMs, options, selectedKey, onFeatureClick]);

  const getTooltip = useMemo(
    () => (options.tooltip.show !== false ? buildDeckTooltip(options.tooltip.template ?? DEFAULT_TOOLTIP_TEMPLATE) : null),
    [options.tooltip.show, options.tooltip.template],
  );

  return useMemo(
    () => ({
      layers,
      getTooltip,
      preparedLayerStates,
    }),
    [getTooltip, layers, preparedLayerStates],
  );
}

export type PanelFeaturesByLayerId = Map<string, GeoFeature[]>;

export function usePanelFeatures(data: PanelData, options: MapPanelOptions): PanelFeaturesByLayerId {
  
  const featuresByLayerId = useMemo(() => {
    const featuresByLayerId = new Map<string, GeoFeature[]>();

    for (const layerConfig of options.layers) {
      const features = dataFramesToFeatures(
        data.series,
        layerConfig.queryRefId,
        layerConfig.geometry,
        layerConfig.elevation,
        layerConfig.fieldMappings
      );
      featuresByLayerId.set(layerConfig.id, features);
    }

    return featuresByLayerId;
  }, [data.series, options.layers]);

  const geoJsonFeatures = useGeoJsonUrlFeatures(options);

  const mergedFeatures = useMemo(() => {
    const merged = new Map(featuresByLayerId);
    for (const [id, features] of geoJsonFeatures) {
      merged.set(id, features);
    }
    return merged;
  }, [featuresByLayerId, geoJsonFeatures]);
  return mergedFeatures;
}

export function useGeoJsonUrlFeatures(options: MapPanelOptions): PanelFeaturesByLayerId {
  const [featuresByLayerId, setFeaturesByLayerId] = useState<PanelFeaturesByLayerId>(new Map());
  const prevKeyRef = useRef<string>('');

  const fetchKey = useMemo(() => {
    return JSON.stringify(
      options.layers
        .filter((l) => l.dataSource?.type === 'geojson-url')
        .map((l) => ({
          id: l.id,
          url: l.dataSource!.type === 'geojson-url' ? l.dataSource!.url : '',
        }))
    );
  }, [options.layers]);

  useEffect(() => {
    const geoJsonLayers = options.layers.filter(
      (l) => l.dataSource?.type === 'geojson-url' && l.dataSource.url
    );

    if (geoJsonLayers.length === 0) {
      if (prevKeyRef.current !== '') {
        setFeaturesByLayerId(new Map());
        prevKeyRef.current = '';
      }
      return;
    }

    if (fetchKey === prevKeyRef.current) {
      return;
    }
    prevKeyRef.current = fetchKey;

    let cancelled = false;
    const result = new Map<string, GeoFeature[]>();

    Promise.all(
      geoJsonLayers.map(async (layer) => {
        const url = layer.dataSource!.type === 'geojson-url' ? layer.dataSource!.url : '';
        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const geojson = await response.json();
          result.set(layer.id, geojsonToFeatures(geojson));
        } catch (err) {
          console.warn(`[timeseriesmap] Failed to fetch GeoJSON for layer "${layer.label}":`, err);
          result.set(layer.id, []);
        }
      })
    ).then(() => {
      if (!cancelled) {
        setFeaturesByLayerId(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fetchKey, options.layers]);

  return featuresByLayerId;
}
