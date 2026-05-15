import React, { useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/css';
import { Button, Combobox, Input, RadioButtonGroup, useStyles2, type ComboboxOption } from '@grafana/ui';
import type { GrafanaTheme2, StandardEditorProps } from '@grafana/data';
import type { InitialViewFitDataSource, InitialViewMode, MapPanelOptions } from '../types';
import { getCurrentViewportSnapshot, requestFitToDataCapture, subscribeCurrentViewportSnapshot } from './currentViewportStore';

const VIEW_MODE_OPTIONS: Array<ComboboxOption<InitialViewMode>> = [
  { label: 'Coordinates', value: 'manual', description: 'Start at the configured latitude, longitude, and zoom.' },
  { label: 'Fit to data', value: 'fitData', description: 'Automatically fit the initial view to the loaded layer data.' },
];

const FIT_DATA_SOURCE_OPTIONS: Array<{ label: string; value: InitialViewFitDataSource }> = [
  { label: 'All layers', value: 'allLayers' },
  { label: 'Layer', value: 'layer' },
];

const DEFAULT_INITIAL_VIEW: MapPanelOptions['initialView'] = {
  mode: 'manual',
  state: {
    latitude: 40.7128,
    longitude: -74.006,
    zoom: 11,
    bearing: 0,
    pitch: 0,
  },
  fitData: {
    source: 'allLayers',
    padding: 48,
    maxZoom: 22,
  },
};

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function numberOrFallback(value: unknown, fallback: number) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function normalizeInitialView(value?: MapPanelOptions['initialView']): MapPanelOptions['initialView'] {
  const fitDataSource = value?.fitData?.source === 'layer' ? 'layer' : 'allLayers';
  return {
    mode: value?.mode ?? DEFAULT_INITIAL_VIEW.mode,
    state: {
      latitude: numberOrFallback(value?.state?.latitude, DEFAULT_INITIAL_VIEW.state.latitude),
      longitude: numberOrFallback(value?.state?.longitude, DEFAULT_INITIAL_VIEW.state.longitude),
      zoom: numberOrFallback(value?.state?.zoom, DEFAULT_INITIAL_VIEW.state.zoom),
      bearing: numberOrFallback(value?.state?.bearing, DEFAULT_INITIAL_VIEW.state.bearing ?? 0),
      pitch: numberOrFallback(value?.state?.pitch, DEFAULT_INITIAL_VIEW.state.pitch ?? 0),
    },
    fitData: {
      source: fitDataSource,
      layerId: value?.fitData?.layerId,
      padding: numberOrFallback(value?.fitData?.padding, DEFAULT_INITIAL_VIEW.fitData?.padding ?? 48),
      maxZoom: numberOrFallback(value?.fitData?.maxZoom, DEFAULT_INITIAL_VIEW.fitData?.maxZoom ?? 22),
    },
  };
}

export function InitialViewEditor({ value, onChange, context }: StandardEditorProps<MapPanelOptions['initialView'], unknown, MapPanelOptions>) {
  const styles = useStyles2(getStyles);
  const [currentViewport, setCurrentViewport] = useState(() => getCurrentViewportSnapshot());
  const initialView = useMemo(() => normalizeInitialView(value), [value]);
  const isManual = initialView.mode === 'manual';
  const fitDataSource = initialView.fitData?.source ?? 'allLayers';
  const layerOptions = useMemo(
    () =>
      (context.options?.layers ?? []).map((layer) => ({
        label: layer.label || layer.type,
        value: layer.id,
      })),
    [context.options?.layers],
  );

  useEffect(() => {
    return subscribeCurrentViewportSnapshot(() => setCurrentViewport(getCurrentViewportSnapshot()));
  }, []);

  const patch = (updates: Partial<MapPanelOptions['initialView']>) => {
    onChange({
      ...initialView,
      ...updates,
      state: {
        ...initialView.state,
        ...(updates.state ?? {}),
      },
      fitData: {
        ...initialView.fitData,
        ...(updates.fitData ?? {}),
      },
    });
  };

  const patchState = (key: keyof MapPanelOptions['initialView']['state'], next: string) => {
    patch({
      state: {
        ...initialView.state,
        [key]: Number(next),
      },
    });
  };

  const applyCurrentViewport = () => {
    if (!isManual) {
      requestFitToDataCapture();
      return;
    }

    if (!currentViewport) {
      return;
    }

    onChange({
      mode: 'manual',
      state: {
        latitude: round(currentViewport.latitude, 6),
        longitude: round(currentViewport.longitude, 6),
        zoom: round(currentViewport.zoom, 2),
        bearing: round(currentViewport.bearing, 1),
        pitch: round(currentViewport.pitch, 1),
      },
    });
  };

  return (
    <div className={styles.root}>
      <div className={styles.grid}>
        <div className={styles.labelCell}>View</div>
        <div className={styles.controlCell}>
          <Combobox options={VIEW_MODE_OPTIONS} value={initialView.mode} onChange={(option) => option?.value && patch({ mode: option.value })} />
        </div>
        {!isManual && (
          <>
            <div className={styles.labelCell}>Data</div>
            <div className={styles.controlCell}>
              <RadioButtonGroup<InitialViewFitDataSource>
                fullWidth
                options={FIT_DATA_SOURCE_OPTIONS}
                value={fitDataSource}
                onChange={(source) => patch({ fitData: { ...initialView.fitData, source } })}
              />
            </div>
            {fitDataSource === 'layer' && (
              <>
                <div className={styles.labelCell}>Layer</div>
                <div className={styles.controlCell}>
                  <Combobox
                    options={layerOptions}
                    value={initialView.fitData?.layerId ?? null}
                    onChange={(option) => patch({ fitData: { ...initialView.fitData, layerId: option?.value } })}
                  />
                </div>
              </>
            )}
            <div className={styles.labelCell}>Padding</div>
            <div className={styles.controlCell}>
              <Input
                type="number"
                value={String(initialView.fitData?.padding ?? 48)}
                onChange={(event) => patch({ fitData: { ...initialView.fitData, padding: Number(event.currentTarget.value) } })}
              />
            </div>
            <div className={styles.labelCell}>Max Zoom</div>
            <div className={styles.controlCell}>
              <Input
                type="number"
                value={String(initialView.fitData?.maxZoom ?? 22)}
                onChange={(event) => patch({ fitData: { ...initialView.fitData, maxZoom: Number(event.currentTarget.value) } })}
              />
            </div>
          </>
        )}
        {isManual && (
          <>
            <div className={styles.labelCell}>Latitude</div>
            <div className={styles.controlCell}>
              <Input type="number" value={String(initialView.state.latitude)} onChange={(event) => patchState('latitude', event.currentTarget.value)} />
            </div>
            <div className={styles.labelCell}>Longitude</div>
            <div className={styles.controlCell}>
              <Input type="number" value={String(initialView.state.longitude)} onChange={(event) => patchState('longitude', event.currentTarget.value)} />
            </div>
            <div className={styles.labelCell}>Zoom</div>
            <div className={styles.controlCell}>
              <Input type="number" value={String(initialView.state.zoom)} onChange={(event) => patchState('zoom', event.currentTarget.value)} />
            </div>
            <div className={styles.labelCell}>Bearing</div>
            <div className={styles.controlCell}>
              <Input type="number" value={String(initialView.state.bearing ?? 0)} onChange={(event) => patchState('bearing', event.currentTarget.value)} />
            </div>
            <div className={styles.labelCell}>Pitch</div>
            <div className={styles.controlCell}>
              <Input type="number" value={String(initialView.state.pitch ?? 0)} onChange={(event) => patchState('pitch', event.currentTarget.value)} />
            </div>
          </>
        )}
      </div>
      <Button variant="secondary" fill="outline" disabled={isManual && !currentViewport} onClick={applyCurrentViewport}>
        {isManual ? 'Use current map settings' : 'Fit to data'}
      </Button>
    </div>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    root: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(1),
    }),
    title: css({
      fontSize: theme.typography.h5.fontSize,
      fontWeight: theme.typography.fontWeightMedium,
      color: theme.colors.text.primary,
    }),
    description: css({
      color: theme.colors.text.secondary,
      fontSize: theme.typography.bodySmall.fontSize,
      marginTop: `calc(${theme.spacing(0.25)} * -1)`,
    }),
    grid: css({
      display: 'grid',
      gridTemplateColumns: '80px minmax(0, 1fr)',
      gap: theme.spacing(1),
      alignItems: 'center',
    }),
    labelCell: css({
      padding: `${theme.spacing(0.75)} ${theme.spacing(1)}`,
      borderRadius: theme.shape.radius.default,
      background: theme.colors.background.secondary,
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeightMedium,
      fontSize: theme.typography.bodySmall.fontSize,
    }),
    controlCell: css({
      '& input': {
        width: '100%',
      },
      '& label': {
        width: '100%',
      },
    }),
  };
}
