import React from 'react';
import { Widget, type WidgetPlacement, type WidgetProps } from '@deck.gl/core';
import { computePosition, offset, flip, shift, AlignedPlacement } from '@floating-ui/dom';
import { renderLiquidTemplate } from 'utils/liquid';

export type WelcomeWidgetProps = WidgetProps & {
  placement?: WidgetPlacement;
  viewId?: string | null;
  label?: string;
  /** Rendered HTML for the panel body. */
  template: string;
  /** Panel heading shown above the template content. */
  title?: string;
};

export const DEFAULT_WELCOME_TEMPLATE = `\
<h2>Welcome to the map</h2>
<p>Use <strong>drag</strong> to pan, <strong>scroll</strong> to zoom, and <strong>click</strong> on features for details.</p>
`;

// type AlignedPlacement = "bottom-start" | "top-start" | "top-end" | "right-start" | "right-end" | "bottom-end" | "left-start" | "left-end"

const convertPlacementToAligned = (placement: WidgetPlacement): AlignedPlacement => {
  switch (placement) {
    case 'top-left': return 'top-start';
    case 'top-right': return 'top-end';
    case 'bottom-left': return 'bottom-start';
    case 'bottom-right': return 'bottom-end';
    default: return 'top-start';
  }
};

export class WelcomeWidget extends Widget<WelcomeWidgetProps> {
  static defaultProps: Required<WelcomeWidgetProps> = {
    ...Widget.defaultProps,
    id: 'welcome',
    placement: 'top-left' as WidgetPlacement,
    viewId: null,
    label: 'Help',
    template: '',
    title: '',
  };

  className = 'deck-widget-welcome';
  placement: WidgetPlacement = 'top-left';

  private open_ = false;
  private rootEl_: HTMLElement | null = null;
  private boundClick_: ((e: MouseEvent) => void) | null = null;

  constructor(props: WelcomeWidgetProps = {} as WelcomeWidgetProps) {
    super(props);
    this.setProps(this.props);
  }

  setProps(props: Partial<WelcomeWidgetProps>) {
    this.placement = props.placement ?? this.placement;
    this.viewId = props.viewId ?? this.viewId;
    const raw = props.template || DEFAULT_WELCOME_TEMPLATE;
    const template = renderLiquidTemplate(raw, {}) ?? raw;
    super.setProps({ ...props, template });
  }

  onRenderHTML(rootElement: HTMLElement): void {
    this.rootEl_ = rootElement;
    const { label, template, title } = this.props;

    const panelHtml = this.open_ && template
      ? `<div class="welcome-widget-panel" style="visibility:hidden">
           <button class="welcome-widget-close" type="button" title="Close">&times;</button>
           ${title ? `<div class="welcome-widget-title">${escapeHtml(title)}</div>` : ''}
           <div class="welcome-widget-content">${template}</div>
         </div>`
      : '';

    rootElement.className = 'welcome-widget-root';
    rootElement.innerHTML = `
      <button class="deck-widget deck-widget-button welcome-widget-trigger" type="button" title="${escapeAttr(label)}">
        <span class="welcome-widget-icon">?</span>
      </button>
      ${panelHtml}
    `;

    if (!this.boundClick_) {
      this.boundClick_ = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('.welcome-widget-trigger')) {
          this.toggle();
        } else if (target.closest('.welcome-widget-close')) {
          this.close();
        }
      };
    }
    rootElement.addEventListener('click', this.boundClick_);

    if (this.open_ && template) {
      this.positionPanel(rootElement);
    }
  }

  private positionPanel(rootElement: HTMLElement) {
    const trigger = rootElement.querySelector('.welcome-widget-trigger') as HTMLElement | null;
    const panel = rootElement.querySelector('.welcome-widget-panel') as HTMLElement | null;
    if (!trigger || !panel) return;

    computePosition(trigger, panel, {
      placement: convertPlacementToAligned(this.placement),
      middleware: [
        // offset(6),
        // flip({ padding: 12 }),
        // shift({ padding: 8 }),
      ],
    }).then(({ x, y }) => {
      Object.assign(panel.style, {
        left: `${x}px`,
        top: `${y}px`,
        position: 'absolute',
        visibility: 'visible',
      });
    });
  }

  onRemove(): void {
    if (this.rootEl_ && this.boundClick_) {
      this.rootEl_.removeEventListener('click', this.boundClick_);
    }
    this.rootEl_ = null;
  }

  private toggle() {
    this.open_ = !this.open_;
    this.redraw();
  }

  private close() {
    this.open_ = false;
    this.redraw();
  }

  private redraw() {
    if (this.rootEl_) {
      this.onRenderHTML(this.rootEl_);
    }
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
