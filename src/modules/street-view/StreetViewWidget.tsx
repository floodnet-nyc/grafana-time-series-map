/* eslint-disable react/react-in-jsx-scope */
/** @jsxImportSource preact */
import { Widget, type WidgetPlacement } from '@deck.gl/core';
import { render } from 'preact';
import {
  clearStreetViewPanorama,
  loadStreetViewPanorama,
  type StreetViewPanoramaSession,
} from './googlePanoramaAdapter';
import { getFeatureCoords, getMapsUrl, getStreetViewStatusMessage } from './streetViewModel';
import type { StreetViewStatus, StreetViewWidgetProps } from './types';

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
  private panoramaSession_: StreetViewPanoramaSession | null = null;
  private status_: StreetViewStatus = 'idle';
  private lastRequestKey_: string | null = null;
  private requestToken_ = 0;

  constructor(props: StreetViewWidgetProps = {}) {
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
  }

  private renderView_() {
    if (!this.rootEl_) {
      return;
    }

    render(
      <StreetViewWidgetView
        collapsed={this.collapsed_}
        label={this.props.label}
        icon={this.props.icon}
        title={this.props.title}
        height={this.props.height ?? StreetViewWidget.defaultProps.height}
        status={this.status_}
        selectedKey={this.props.selectedKey}
        mapsUrl={getMapsUrl(getFeatureCoords(this.props.selectedFeature))}
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

    const requestKey = `${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`;
    if (this.status_ === 'ready' && this.lastRequestKey_ === requestKey && this.panoramaSession_) {
      requestAnimationFrame(() => {
        if (this.panoramaSession_) {
          maps.event.trigger(this.panoramaSession_.panorama, 'resize');
        }
      });
      return;
    }

    this.lastRequestKey_ = requestKey;
    this.setStatus_('loading');
    const token = ++this.requestToken_;
    const session = await loadStreetViewPanorama({
      container: this.panoContainerEl_,
      coords,
      selectedKey: this.props.selectedKey,
      existing: this.panoramaSession_,
      maps,
    });

    if (token !== this.requestToken_ || this.collapsed_) {
      return;
    }

    if (!session) {
      this.clearPanorama_();
      this.setStatus_('no-coverage');
      return;
    }

    this.panoramaSession_ = session;
    this.setStatus_('ready');
  }

  private setStatus_(next: StreetViewStatus) {
    if (this.status_ === next) {
      return;
    }
    this.status_ = next;
    this.renderView_();
  }

  private clearPanorama_() {
    clearStreetViewPanorama(this.panoramaSession_, this.panoContainerEl_);
    this.panoramaSession_ = null;
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
  provider?: StreetViewWidgetProps['provider'];
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
          {getStreetViewStatusMessage(status, provider)}
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
