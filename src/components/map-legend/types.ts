import type { LayerConfig } from '../../layers';

export interface MapLegendProps {
  layers: LayerConfig[];
  onToggleVisibility?: (layerId: string) => void;
  panelWidth?: number;
  showEye?: boolean;
  maxWidth?: number;
  maxHeight?: number;
}
