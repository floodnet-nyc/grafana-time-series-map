import type { WidgetPlacement, WidgetProps } from '@deck.gl/core';
import type { Feature } from 'geojson';

export type StreetViewStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'no-selection'
  | 'no-location'
  | 'unsupported'
  | 'no-coverage';

export type StreetViewProvider = 'google' | 'maplibre';

export type StreetViewWidgetProps = WidgetProps & {
  placement?: WidgetPlacement;
  viewId?: string | null;
  label?: string;
  icon?: string;
  defaultCollapsed?: boolean;
  title?: string;
  height?: number;
  selectedFeature?: Feature | null;
  selectedKey?: string | null;
  provider?: StreetViewProvider;
};

export interface StreetViewCoords {
  lat: number;
  lng: number;
}
