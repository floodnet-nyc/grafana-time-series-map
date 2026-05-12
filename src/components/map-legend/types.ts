import type { LayerConfig } from '../../types';

export interface MapLegendProps {
  layers: LayerConfig[];
  onToggleVisibility?: (layerId: string) => void;
  panelWidth?: number;
  showEye?: boolean;
}
