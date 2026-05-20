/* eslint-disable react/react-in-jsx-scope */
/** @jsxImportSource preact */
import { Widget, type WidgetPlacement, type WidgetProps } from '@deck.gl/core';
import type { Feature, Point } from 'geojson';
import { render } from 'preact';

type StreetViewStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'no-selection'
  | 'no-location'
  | 'unsupported'
  | 'no-coverage';

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
  provider?: 'google' | 'maplibre';
};

export class StreetViewWidget extends Widget<StreetViewWidgetProps> {
  static defaultProps: Required<StreetViewWidgetProps> = {
    ...Widget.defaultProps,
    id: 'street-view',
    placement: 'bottom-right' as WidgetPlacement,
    viewId: null,
    label: 'Street View',
    icon: '\u25a3',
    defaultCollapsed: true,
    title: 'Street View',
    height: 240,
    selectedFeature: null,
    selectedKey: null,
    provider: 'google',
  };

  className = 'deck-widget-street-view';
  placement: WidgetPlacement = 'bottom-right';

  private collapsed_ = true;
  private rootEl_: HTMLElement | null = null;
  private panoContainerEl_: HTMLDivElement | null = null;
  private panoHostEl_: HTMLDivElement | null = null;
  private pano_: google.maps.StreetViewPanorama | null = null;
  private marker_: google.maps.Marker | null = null;
  private status_: StreetViewStatus = 'idle';
  private lastRequestKey_: string | null = null;
  private requestToken_ = 0;

  constructor(props: StreetViewWidgetProps = {} as StreetViewWidgetProps) {
    super(props);
    this.collapsed_ = props.defaultCollapsed ?? StreetViewWidget.defaultProps.defaultCollapsed;
    this.setProps(this.props);
  }

  setProps(props: Partial<StreetViewWidgetProps>) {
    this.placement = props.placement ?? this.placement;
    this.viewId = props.viewId ?? this.viewId;
    if (props.defaultCollapsed !== undefined && props.defaultCollapsed !== this.props.defaultCollapsed) {
      this.collapsed_ = props.defaultCollapsed;
    }
    super.setProps(props);
    if (this.rootEl_) {
      this.renderView_();
      if (!this.collapsed_) {
        void this.syncStreetView_();
      }
    }
  }

  onRenderHTML(rootElement: HTMLElement): void {
    this.rootEl_ = rootElement;
    rootElement.classList.add('street-view-widget-root');
    this.renderView_();
    if (!this.collapsed_) {
      void this.syncStreetView_();
    }
  }

  onRemove(): void {
    this.requestToken_ += 1;
    this.clearPanorama_();
    if (this.rootEl_) {
      render(null, this.rootEl_);
    }
    this.rootEl_ = null;
    this.panoContainerEl_ = null;
    this.panoHostEl_ = null;
  }

  private renderView_() {
    if (!this.rootEl_) {
      return;
    }
    const coords = getFeatureCoords(this.props.selectedFeature);
    const mapsUrl =
      coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)
        ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`
        : undefined;

    render(
      <StreetViewWidgetView
        collapsed={this.collapsed_}
        label={this.props.label}
        icon={this.props.icon}
        title={this.props.title}
        height={this.props.height ?? StreetViewWidget.defaultProps.height}
        status={this.status_}
        selectedKey={this.props.selectedKey}
        mapsUrl={mapsUrl}
        provider={this.props.provider}
        onToggle={() => this.toggle_()}
        onContainerRef={(el) => {
          this.panoContainerEl_ = el;
        }}
      />,
      this.rootEl_
    );
  }

  private toggle_() {
    this.collapsed_ = !this.collapsed_;
    this.renderView_();
    if (this.collapsed_) {
      this.requestToken_ += 1;
      this.clearPanorama_();
      return;
    }
    void this.syncStreetView_();
  }

  private async syncStreetView_() {
    if (this.collapsed_) {
      return;
    }

    if (this.props.provider !== 'google') {
      this.setStatus_('unsupported');
      return;
    }

    const coords = getFeatureCoords(this.props.selectedFeature);
    if (!this.props.selectedFeature || !this.props.selectedKey) {
      this.setStatus_('no-selection');
      this.clearPanorama_();
      return;
    }
    if (!coords) {
      this.setStatus_('no-location');
      this.clearPanorama_();
      return;
    }

    const maps = globalThis.google?.maps;
    if (!maps?.StreetViewService || !this.panoContainerEl_) {
      this.setStatus_('unsupported');
      return;
    }

    if (this.pano_ && this.panoHostEl_ !== this.panoContainerEl_) {
      this.clearPanorama_();
    }

    const requestKey = `${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`;
    if (this.status_ === 'ready' && this.lastRequestKey_ === requestKey && this.pano_) {
      requestAnimationFrame(() => {
        if (this.pano_) {
          maps.event.trigger(this.pano_, 'resize');
        }
      });
      return;
    }

    this.lastRequestKey_ = requestKey;
    this.setStatus_('loading');
    const token = ++this.requestToken_;

    const service = new maps.StreetViewService();
    service.getPanorama({ location: coords, radius: 75 }, (data, status) => {
      if (token !== this.requestToken_ || this.collapsed_) {
        return;
      }

      if (status !== maps.StreetViewStatus.OK || !data?.location?.pano) {
        this.clearPanorama_();
        this.setStatus_('no-coverage');
        return;
      }

      const heading = data.location.latLng ? computeHeading(data.location.latLng, coords) : 0;
      const pov: google.maps.StreetViewPov = { heading, pitch: -10 };

      if (!this.pano_) {
        this.pano_ = new maps.StreetViewPanorama(this.panoContainerEl_!, {
          pano: data.location.pano,
          pov,
          visible: true,
          addressControl: false,
          motionTracking: false,
          clickToGo: true,
          linksControl: true,
          fullscreenControl: true,
        });
        this.panoHostEl_ = this.panoContainerEl_;
      } else {
        this.pano_.setPano(data.location.pano);
        this.pano_.setPov(pov);
        this.pano_.setVisible(true);
      }

      requestAnimationFrame(() => {
        if (this.pano_) {
          maps.event.trigger(this.pano_, 'resize');
        }
      });

      try {
        if (this.marker_) {
          this.marker_.setMap(null);
        }
        this.marker_ = new maps.Marker({
          position: coords,
          map: this.pano_,
          title: this.props.selectedKey ?? 'Selected feature',
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 5,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            fillColor: '#3388ff',
            fillOpacity: 1,
          },
        });
      } catch {
        this.marker_ = null;
      }

      this.setStatus_('ready');
    });
  }

  private setStatus_(next: StreetViewStatus) {
    if (this.status_ === next) {
      return;
    }
    this.status_ = next;
    this.renderView_();
  }

  private clearPanorama_() {
    if (this.marker_) {
      this.marker_.setMap(null);
      this.marker_ = null;
    }
    if (this.pano_) {
      this.pano_.setVisible(false);
      this.pano_ = null;
    }
    this.panoHostEl_ = null;
    if (this.panoContainerEl_) {
      this.panoContainerEl_.innerHTML = '';
    }
  }
}

function StreetViewWidgetView({
  collapsed,
  label,
  icon,
  title,
  height,
  status,
  selectedKey,
  mapsUrl,
  provider,
  onToggle,
  onContainerRef,
}: {
  collapsed: boolean;
  label?: string;
  icon?: string;
  title?: string;
  height: number;
  status: StreetViewStatus;
  selectedKey?: string | null;
  mapsUrl?: string;
  provider?: 'google' | 'maplibre';
  onToggle: () => void;
  onContainerRef: (el: HTMLDivElement | null) => void;
}) {
  if (collapsed) {
    return (
      <div className="street-view-widget-card street-view-widget-card-collapsed">
        <button
          className="street-view-widget-toggle street-view-widget-toggle-collapsed"
          type="button"
          onClick={onToggle}
          title="Expand Street View"
        >
          <span className="street-view-widget-chevron">{'\u203A'}</span>
          {icon ? <span className="street-view-widget-icon">{icon}</span> : null}
          <span className="street-view-widget-label">{label || 'Street View'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="street-view-widget-card street-view-widget-card-expanded">
      <div className="street-view-widget-header">
        <div className="street-view-widget-header-main">
          {icon ? <span className="street-view-widget-icon">{icon}</span> : null}
          <span className="street-view-widget-label">{label || 'Street View'}</span>
          {title ? <span className="street-view-widget-title">{title}</span> : null}
        </div>
        <button
          className="street-view-widget-toggle street-view-widget-toggle-expanded"
          type="button"
          onClick={onToggle}
          title="Collapse Street View"
        >
          <span className="street-view-widget-chevron">{'\u2039'}</span>
        </button>
      </div>
      <div className="street-view-widget-meta">
        {selectedKey ? <span className="street-view-widget-key">{selectedKey}</span> : null}
        {mapsUrl ? (
          <a className="street-view-widget-link" href={mapsUrl} target="_blank" rel="noopener noreferrer">
            Open in Google Maps
          </a>
        ) : null}
      </div>
      {status !== 'ready' ? (
        <div className="street-view-widget-empty" style={{ height }}>
          {statusMessage(status, provider)}
        </div>
      ) : null}
      <div
        ref={onContainerRef}
        className="street-view-widget-panorama"
        style={{ height, display: status === 'ready' ? 'block' : 'none' }}
      />
    </div>
  );
}

function statusMessage(status: StreetViewStatus, provider?: 'google' | 'maplibre') {
  switch (status) {
    case 'loading':
      return 'Loading Street View...';
    case 'no-selection':
      return 'Select a point feature to preview Street View.';
    case 'no-location':
      return 'The selected feature does not have a point location.';
    case 'unsupported':
      return provider === 'google'
        ? 'Street View is not available yet. Wait for Google Maps to finish loading.'
        : 'Street View requires the Google basemap provider.';
    case 'no-coverage':
      return 'No Street View coverage at this location.';
    case 'idle':
    case 'ready':
    default:
      return '';
  }
}

function getFeatureCoords(feature?: Feature | null): { lat: number; lng: number } | null {
  if (!feature?.geometry || feature.geometry.type !== 'Point') {
    return null;
  }
  const [lng, lat] = (feature.geometry as Point).coordinates;
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function computeHeading(
  from: google.maps.LatLng | google.maps.LatLngLiteral,
  to: google.maps.LatLngLiteral
): number {
  const fromLat = typeof from.lat === 'function' ? from.lat() : from.lat;
  const fromLng = typeof from.lng === 'function' ? from.lng() : from.lng;
  const lat1 = toRad(fromLat);
  const lat2 = toRad(to.lat);
  const deltaLng = toRad(to.lng - fromLng);
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function toDeg(value: number) {
  return (value * 180) / Math.PI;
}
