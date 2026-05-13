import type React from 'react';

export const mapCardStyle: React.CSSProperties = {
  background: 'rgba(14, 16, 25, 0.63)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  backdropFilter: 'blur(6px)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
};

// Variant for deck.gl tooltip — same look, includes content defaults.
// deck.gl applies these as inline styles so all values must be strings.
export const mapCardTooltipStyle: Partial<CSSStyleDeclaration> = {
  background: 'rgba(14, 16, 25, 0.63)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  backdropFilter: 'blur(6px)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
  padding: '8px 12px',
  color: '#e8e8e8',
  fontFamily: 'inherit',
  fontSize: '12px',
  lineHeight: '1.5',
};
