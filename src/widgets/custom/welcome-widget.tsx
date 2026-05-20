import { Widget, type WidgetPlacement, type WidgetProps } from '@deck.gl/core';
import { h, render } from 'preact';
import { renderLiquidTemplate } from 'utils/liquid';

export type WelcomeWidgetProps = WidgetProps & {
  placement?: WidgetPlacement;
  viewId?: string | null;
  label?: string;
  icon?: string;
  imageUrl?: string;
  defaultCollapsed?: boolean;
  template: string;
  title?: string;
};

export const DEFAULT_WELCOME_TEMPLATE = `\
<h2>Welcome to the map</h2>
<p>Use <strong>drag</strong> to pan, <strong>scroll</strong> to zoom, and <strong>click</strong> on features for details.</p>
`;

export class WelcomeWidget extends Widget<WelcomeWidgetProps> {
  static defaultProps: Required<WelcomeWidgetProps> = {
    ...Widget.defaultProps,
    id: 'welcome',
    placement: 'top-left' as WidgetPlacement,
    viewId: null,
    label: 'Help',
    icon: '',
    imageUrl: '',
    defaultCollapsed: false,
    template: '',
    title: '',
  };

  className = 'deck-widget-welcome';
  placement: WidgetPlacement = 'top-left';

  private collapsed_ = false;
  private rootEl_: HTMLElement | null = null;

  constructor(props: WelcomeWidgetProps = {} as WelcomeWidgetProps) {
    super(props);
    this.collapsed_ = props.defaultCollapsed ?? WelcomeWidget.defaultProps.defaultCollapsed;
    this.setProps(this.props);
  }

  setProps(props: Partial<WelcomeWidgetProps>) {
    this.placement = props.placement ?? this.placement;
    this.viewId = props.viewId ?? this.viewId;
    if (props.defaultCollapsed !== undefined) {
      this.collapsed_ = props.defaultCollapsed;
    }
    const raw = props.template || DEFAULT_WELCOME_TEMPLATE;
    const template = renderLiquidTemplate(raw, {}) ?? raw;
    super.setProps({ ...props, template });
  }

  onRenderHTML(rootElement: HTMLElement): void {
    this.rootEl_ = rootElement;
    rootElement.className = 'welcome-widget-root';

    render(
      h(WelcomeWidgetView, {
        collapsed: this.collapsed_,
        label: this.props.label,
        icon: this.props.icon,
        imageUrl: this.props.imageUrl,
        title: this.props.title,
        template: this.props.template,
        onToggle: () => this.toggle(),
      }),
      rootElement
    );
  }

  onRemove(): void {
    if (this.rootEl_) {
      render(null, this.rootEl_);
    }
    this.rootEl_ = null;
  }

  private toggle() {
    this.collapsed_ = !this.collapsed_;
    if (this.rootEl_) {
      this.onRenderHTML(this.rootEl_);
    }
  }
}

function WelcomeWidgetView({
  collapsed,
  label,
  icon,
  imageUrl,
  title,
  template,
  onToggle,
}: {
  collapsed: boolean;
  label?: string;
  icon?: string;
  imageUrl?: string;
  title?: string;
  template: string;
  onToggle: () => void;
}) {
  const hasTriggerContent = Boolean(icon || imageUrl || label);

  if (collapsed) {
    return h(
      'div',
      { className: 'map-card legend-box welcome-widget-card welcome-widget-card-collapsed' },
      h(
        'button',
        {
          className: 'welcome-widget-toggle welcome-widget-toggle-collapsed',
          type: 'button',
          onClick: onToggle,
          title: 'Expand welcome panel',
        },
        h('span', { className: 'welcome-widget-chevron' }, '\u203A'),
        imageUrl ? h('img', { className: 'welcome-widget-image', src: imageUrl, alt: '' }) : null,
        icon ? h('span', { className: 'welcome-widget-icon' }, icon) : null,
        label ? h('span', { className: 'welcome-widget-label' }, label) : null,
        !hasTriggerContent ? h('span', { className: 'welcome-widget-label' }, 'Welcome') : null,
      )
    );
  }

  return h(
    'div',
    { className: 'map-card legend-box welcome-widget-card welcome-widget-card-expanded' },
    h(
      'div',
      { className: 'welcome-widget-header' },
      h(
        'div',
        { className: 'welcome-widget-header-main' },
        imageUrl ? h('img', { className: 'welcome-widget-image', src: imageUrl, alt: '' }) : null,
        icon ? h('span', { className: 'welcome-widget-icon' }, icon) : null,
        label ? h('span', { className: 'welcome-widget-label' }, label) : null,
        title ? h('span', { className: 'welcome-widget-title' }, title) : null,
      ),
      h(
        'button',
        {
          className: 'welcome-widget-toggle welcome-widget-toggle-expanded',
          type: 'button',
          onClick: onToggle,
          title: 'Collapse welcome panel',
        },
        h('span', { className: 'welcome-widget-chevron' }, '\u2039')
      )
    ),
    h('div', {
      className: 'welcome-widget-content',
      dangerouslySetInnerHTML: { __html: template },
    })
  );
}
