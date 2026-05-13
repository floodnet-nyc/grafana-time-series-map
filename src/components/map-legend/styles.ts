import type React from 'react';
import { mapCardStyle } from '../mapCard';

export const legendBoxStyle: React.CSSProperties = {
  ...mapCardStyle,
  position: 'absolute',
  top: 16,
  left: 12,
  zIndex: 100,
};

export const tooltipStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: 4,
  background: 'rgba(20, 22, 34, 0.96)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 5,
  padding: '5px 8px',
  minWidth: 120,
  maxWidth: 200,
  fontSize: 11,
  color: '#ccc',
  lineHeight: 1.4,
  whiteSpace: 'normal',
  zIndex: 200,
  boxShadow: '0 2px 10px rgba(0,0,0,0.6)',
  pointerEvents: 'none',
};
