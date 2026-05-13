import type { LayerConfig } from '../../layers/types';

export interface MapLegendProps {
  layers: LayerConfig[];
  onToggleVisibility?: (layerId: string) => void;
  panelWidth?: number;
  showEye?: boolean;
}
