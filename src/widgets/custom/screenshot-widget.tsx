import html2canvas from 'html2canvas';
import { ScreenshotWidget, type ScreenshotWidgetProps } from '@deck.gl/widgets';

export class CustomScreenshotWidget extends ScreenshotWidget {
  private rootEl_: HTMLElement | null = null;

  constructor(props: ScreenshotWidgetProps = {}) {
    super(props);
  }

  onRenderHTML(rootElement: HTMLElement): void {
    this.rootEl_ = rootElement;
    super.onRenderHTML(rootElement);
  }

  override handleClick() {
    if (this.props.onCapture) {
      this.props.onCapture(this);
      return;
    }

    void this.captureAndDownload();
  }

  private resolveCaptureRoot(canvas: HTMLCanvasElement): HTMLElement {
    const root = this.rootEl_;
    const candidates = [
      root?.closest<HTMLElement>('[data-testid="map"]'),
      canvas.closest<HTMLElement>('[data-testid="map"]'),
      root?.closest<HTMLElement>('.maplibregl-map'),
      canvas.closest<HTMLElement>('.maplibregl-map'),
      canvas.parentElement,
    ];

    return candidates.find((candidate): candidate is HTMLElement => Boolean(candidate && candidate.contains(canvas))) ?? canvas.parentElement ?? canvas;
  }

  private async captureAndDownload() {
    const canvas = this.deck?.getCanvas();
    if (!canvas) {
      return;
    }

    const target = this.resolveCaptureRoot(canvas);
    const screenshotCanvas = await html2canvas(target, {
      backgroundColor: null,
      logging: false,
      useCORS: true,
    });

    this.downloadDataURL(screenshotCanvas.toDataURL(this.props.imageFormat), this.props.filename);
  }
}
