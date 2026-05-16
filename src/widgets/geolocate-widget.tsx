import { Widget, type WidgetPlacement, type WidgetProps } from '@deck.gl/core';
import { h, render } from 'preact';

export type GeolocateWidgetProps = WidgetProps & {
  placement?: WidgetPlacement;
  viewId?: string | null;
  label?: string;
  zoom?: number;
  transitionDuration?: number;
  enableHighAccuracy?: boolean;
  onGeolocate?: (params: { latitude: number; longitude: number; zoom: number }) => void;
  onError?: (message: string) => void;
};

export class GeolocateWidget extends Widget<GeolocateWidgetProps> {
  static defaultProps: Required<GeolocateWidgetProps> = {
    ...Widget.defaultProps,
    id: 'geolocate',
    placement: 'top-right',
    viewId: null,
    label: 'Find my location',
    zoom: 14,
    transitionDuration: 800,
    enableHighAccuracy: true,
    onGeolocate: undefined!,
    onError: undefined!,
  };

  className = 'deck-widget-geolocate';
  placement: WidgetPlacement = 'top-right';

  constructor(props: GeolocateWidgetProps = {}) {
    super(props);
    this.setProps(this.props);
  }

  setProps(props: Partial<GeolocateWidgetProps>) {
    this.placement = props.placement ?? this.placement;
    this.viewId = props.viewId ?? this.viewId;
    super.setProps(props);
  }

  onRenderHTML(rootElement: HTMLElement): void {
    render(
      h(
        'div',
        { className: 'deck-widget-button' },
        h(
          'button',
          {
            className: `deck-widget-icon-button ${this.className}`,
            type: 'button',
            onClick: () => this.handleLocate(),
            title: this.props.label,
          },
          h('span', { style: iconTextStyle }, '◎'),
        ),
      ),
      rootElement
    );
  }

  handleLocate() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.props.onError?.("Your browser doesn't support geolocation.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.props.onGeolocate?.({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          zoom: this.props.zoom,
        });
      },
      () => {
        this.props.onError?.('The geolocation request failed.');
      },
      { enableHighAccuracy: this.props.enableHighAccuracy },
    );
  }
}

const iconTextStyle = {
  alignItems: 'center',
  color: 'currentColor',
  display: 'inline-flex',
  fontSize: '18px',
  height: '100%',
  justifyContent: 'center',
  width: '100%',
};
