export type BuiltInIconDefinition = {
  url: string;
  id?: string;
  width: number;
  height: number;
  anchorX?: number;
  anchorY?: number;
  mask?: boolean;
};

const TABLER_ICON_VERSION = '3.44.0';
const TABLER_ICON_CDN_BASE = `https://unpkg.com/@tabler/icons@${TABLER_ICON_VERSION}`;

export type BuiltInIconOption = {
  label: string;
  value: string;
  description?: string;
  previewUrl?: string;
  title?: string;
};

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function tablerFilledUrl(name: string) {
  return `${TABLER_ICON_CDN_BASE}/icons/filled/${name}.svg`;
}

function createTablerIcon(
  url: string,
  id: string,
  overrides: Partial<BuiltInIconDefinition> = {}
): BuiltInIconDefinition {
  return {
    url,
    id,
    width: 24,
    height: 24,
    anchorX: 12,
    anchorY: 12,
    mask: true,
    ...overrides,
  };
}

const LEGACY_ICONS: Record<string, BuiltInIconDefinition> = {
  marker: {
    id: 'marker',
    url: svgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <path fill="white" d="M32 4C20.4 4 11 13.4 11 25c0 15.8 21 35 21 35s21-19.2 21-35C53 13.4 43.6 4 32 4zm0 30a9 9 0 1 1 0-18 9 9 0 0 1 0 18z"/>
      </svg>
    `),
    width: 64,
    height: 64,
    anchorX: 32,
    anchorY: 64,
    mask: true,
  },
  'marker-shaded': {
    id: 'marker-shaded',
    url: svgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <path fill="white" opacity=".35" d="M32 62s19-18.8 19-36C51 15.5 42.5 7 32 7v55z"/>
        <path fill="white" d="M32 4C20.4 4 11 13.4 11 25c0 15.8 21 35 21 35s21-19.2 21-35C53 13.4 43.6 4 32 4zm0 30a9 9 0 1 1 0-18 9 9 0 0 1 0 18z"/>
      </svg>
    `),
    width: 64,
    height: 64,
    anchorX: 32,
    anchorY: 64,
    mask: true,
  },
  'marker-outline': {
    id: 'marker-outline',
    url: svgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <path fill="white" d="M32 4C20.4 4 11 13.4 11 25c0 15.8 21 35 21 35s21-19.2 21-35C53 13.4 43.6 4 32 4zm0 49.6C25.8 47.1 17 35.6 17 25c0-8.3 6.7-15 15-15s15 6.7 15 15c0 10.6-8.8 22.1-15 28.6z"/>
        <circle fill="white" cx="32" cy="25" r="7"/>
      </svg>
    `),
    width: 64,
    height: 64,
    anchorX: 32,
    anchorY: 64,
    mask: true,
  },
  flag: {
    id: 'flag',
    url: svgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <path fill="white" d="M14 58h6V8h-6v50zM24 9h31l-7 13 7 13H24V9z"/>
      </svg>
    `),
    width: 64,
    height: 64,
    anchorX: 17,
    anchorY: 58,
    mask: true,
  },
  'plain-circle': {
    id: 'plain-circle',
    url: svgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <circle fill="white" cx="32" cy="32" r="28"/>
      </svg>
    `),
    width: 64,
    height: 64,
    anchorX: 32,
    anchorY: 32,
    mask: true,
  },
};

function createBuiltInOption(
  label: string,
  value: string,
  previewUrl: string,
  description: string
): BuiltInIconOption {
  return {
    label,
    value,
    previewUrl,
    description,
    title: label,
  };
}

function createTablerOption(label: string, slug: string): BuiltInIconOption {
  return createBuiltInOption(label, `tabler-filled:${slug}`, tablerFilledUrl(slug), `Tabler filled icon: ${slug}`);
}

const TABLER_CURATED_OPTIONS: BuiltInIconOption[] = [
  createTablerOption('Home', 'home'),
  createTablerOption('School', 'school'),
  createTablerOption('Shield', 'shield'),
  createTablerOption('Lifebuoy', 'lifebuoy'),
  createTablerOption('Alert Circle', 'alert-circle'),
  createTablerOption('Alert Hexagon', 'alert-hexagon'),
  createTablerOption('Alert Octagon', 'alert-octagon'),
  createTablerOption('Alert Square', 'alert-square'),
  createTablerOption('Alert Square Rounded', 'alert-square-rounded'),
  createTablerOption('Alert Triangle', 'alert-triangle'),
  createTablerOption('Circle', 'circle'),
  createTablerOption('Circle Dot', 'circle-dot'),
  createTablerOption('Circles', 'circles'),
  createTablerOption('Square', 'square'),
  createTablerOption('Square Dot', 'square-dot'),
  createTablerOption('Square Rounded', 'square-rounded'),
  createTablerOption('Square Rotated', 'square-rotated'),
  createTablerOption('Squares', 'squares'),
  createTablerOption('Triangle', 'triangle'),
  createTablerOption('Triangle Inverted', 'triangle-inverted'),
  createTablerOption('Diamond', 'diamond'),
  createTablerOption('Diamonds', 'diamonds'),
  createTablerOption('Cone', 'cone'),
  createTablerOption('Cone 2', 'cone-2'),
  createTablerOption('Capsule', 'capsule'),
  createTablerOption('Capsule Horizontal', 'capsule-horizontal'),
  createTablerOption('Bell', 'bell'),
  createTablerOption('Bell Ringing', 'bell-ringing'),
  createTablerOption('Map Pin', 'map-pin'),
  createTablerOption('Pin', 'pin'),
  createTablerOption('Current Location', 'current-location'),
  createTablerOption('Navigation', 'navigation'),
  createTablerOption('Compass', 'compass'),
  createTablerOption('Cloud', 'cloud-computing'),
  createTablerOption('Droplet', 'droplet'),
  createTablerOption('Umbrella', 'umbrella'),
  createTablerOption('Bolt', 'bolt'),
  createTablerOption('Battery', 'battery'),
  createTablerOption('Battery 4', 'battery-4'),
  createTablerOption('Battery Vertical', 'battery-vertical'),
  createTablerOption('Building Tower', 'building-broadcast-tower'),
  createTablerOption('Car', 'car'),
  createTablerOption('Car SUV', 'car-suv'),
  createTablerOption('Bus', 'bus'),
  createTablerOption('Train', 'train'),
  createTablerOption('Plane', 'plane'),
  createTablerOption('Bike', 'bike'),
  createTablerOption('Barrier Block', 'barrier-block'),
  createTablerOption('Crane', 'crane'),
  createTablerOption('User', 'user'),
  createTablerOption('Tree', 'tree'),
  createTablerOption('Leaf', 'leaf'),
  createTablerOption('Mountain', 'mountain'),
  createTablerOption('World', 'world'),
  createTablerOption('Chart Area', 'chart-area'),
  createTablerOption('Chart Area Line', 'chart-area-line'),
  createTablerOption('Chart Dots', 'chart-dots'),
  createTablerOption('Chart Bubble', 'chart-bubble'),
  createTablerOption('Chart Candle', 'chart-candle'),
  createTablerOption('Chart Donut', 'chart-donut'),
  createTablerOption('Chart Pie', 'chart-pie'),
  createTablerOption('Camera', 'camera'),
  createTablerOption('Search', 'search'),
  createTablerOption('Message', 'message'),
  createTablerOption('Help', 'help'),
  createTablerOption('Arrow Up', 'arrow-big-up'),
  createTablerOption('Arrow Down', 'arrow-big-down'),
  createTablerOption('Arrow Left', 'arrow-big-left'),
  createTablerOption('Arrow Right', 'arrow-big-right'),
  createTablerOption('Arrow Up Circle', 'arrow-up-circle'),
  createTablerOption('Arrow Down Circle', 'arrow-down-circle'),
  createTablerOption('Arrow Left Circle', 'arrow-left-circle'),
  createTablerOption('Arrow Right Circle', 'arrow-right-circle'),
  createTablerOption('Arrow Up Square', 'arrow-up-square'),
  createTablerOption('Arrow Down Square', 'arrow-down-square'),
  createTablerOption('Arrow Left Square', 'arrow-left-square'),
  createTablerOption('Arrow Right Square', 'arrow-right-square'),
  createTablerOption('Arrow Up Rhombus', 'arrow-up-rhombus'),
  createTablerOption('Arrow Down Rhombus', 'arrow-down-rhombus'),
  createTablerOption('Arrow Left Rhombus', 'arrow-left-rhombus'),
  createTablerOption('Arrow Right Rhombus', 'arrow-right-rhombus'),
  createTablerOption('Caret Up', 'caret-up'),
  createTablerOption('Caret Down', 'caret-down'),
  createTablerOption('Caret Left', 'caret-left'),
  createTablerOption('Caret Right', 'caret-right'),
];

export const BUILT_IN_ICONS: BuiltInIconOption[] = [
  createBuiltInOption('Marker', 'marker', LEGACY_ICONS.marker.url, 'Built-in marker icon'),
  createBuiltInOption('Marker (shaded)', 'marker-shaded', LEGACY_ICONS['marker-shaded'].url, 'Built-in marker icon'),
  createBuiltInOption('Marker (outline)', 'marker-outline', LEGACY_ICONS['marker-outline'].url, 'Built-in marker icon'),
  createBuiltInOption('Flag', 'flag', LEGACY_ICONS.flag.url, 'Built-in flag icon'),
  createBuiltInOption('Circle', 'plain-circle', LEGACY_ICONS['plain-circle'].url, 'Built-in circle icon'),
  ...TABLER_CURATED_OPTIONS,
];

export const DEFAULT_BUILT_IN_ICON = 'marker';

export function resolveBuiltInIcon(iconName: string): BuiltInIconDefinition {
  const normalized = iconName.trim();
  const legacy = LEGACY_ICONS[normalized];
  if (legacy) {
    return legacy;
  }

  if (normalized.startsWith('tabler-filled:')) {
    const slug = normalized.slice('tabler-filled:'.length);
    return createTablerIcon(tablerFilledUrl(slug), normalized);
  }

  if (normalized.startsWith('tabler:')) {
    const slug = normalized.slice('tabler:'.length);
    return createTablerIcon(tablerFilledUrl(slug), normalized);
  }

  return LEGACY_ICONS[DEFAULT_BUILT_IN_ICON];
}

export function isBuiltInIconName(iconName: string) {
  return Boolean(iconName && (iconName in LEGACY_ICONS || iconName.startsWith('tabler:') || iconName.startsWith('tabler-filled:')));
}
