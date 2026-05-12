import React from 'react';
import type { Feature } from 'geojson';
import { buildSensorPopupModel } from './SensorPopupModel';

interface SensorPopupProps {
  selectedKey: string;
  feature: Feature | null;
  onClose: () => void;
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    position: 'absolute',
    top: 12,
    right: 12,
    background: 'rgba(16, 18, 28, 0.93)',
    border: '1px solid rgba(255, 230, 60, 0.35)',
    borderRadius: 8,
    padding: '12px 16px 14px',
    color: '#e8e8e8',
    minWidth: 180,
    zIndex: 100,
    backdropFilter: 'blur(6px)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
    fontFamily: 'inherit',
  },
  closeBtn: {
    position: 'absolute',
    top: 6,
    right: 10,
    background: 'none',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    fontSize: 18,
    lineHeight: 1,
    padding: 0,
  },
  label: {
    fontSize: 10,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    color: '#888',
    marginBottom: 2,
  },
  value: {
    fontWeight: 700,
    fontSize: 14,
    marginBottom: 10,
  },
  depthValue: {
    fontWeight: 700,
    fontSize: 22,
    color: '#00cbff',
    lineHeight: 1,
  },
  depthUnit: {
    fontSize: 13,
    color: '#00cbff',
    opacity: 0.7,
    marginLeft: 2,
  },
};

export function SensorPopup({ selectedKey, feature, onClose }: SensorPopupProps) {
  const model = buildSensorPopupModel(selectedKey, feature);

  return (
    <div style={styles.card}>
      <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
        ×
      </button>

      <div style={styles.label}>Sensor</div>
      <div style={styles.value}>{model.sensorLabel}</div>

      {model.depthDisplay && (
        <>
          <div style={styles.label}>Depth</div>
          <div>
            <span style={styles.depthValue}>{model.depthDisplay}</span>
            <span style={styles.depthUnit}>{model.depthUnit}</span>
          </div>
        </>
      )}
    </div>
  );
}
