import type { LayerConfig } from '../../layers/_all';

export interface MapLegendProps {
  layers: LayerConfig[];
  onToggleVisibility?: (layerId: string) => void;
  panelWidth?: number;
  showEye?: boolean;
}
