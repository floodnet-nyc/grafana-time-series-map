import { CollisionFilterExtension as CollisionFilterExtension_ } from '@deck.gl/extensions';

export default class CollisionFilterExtension extends CollisionFilterExtension_ {
  initializeState(this: any, context: any, extension: any) {
    super.initializeState(context, extension);
    const eff = context.deck.effectManager.getEffects().find((e: any) => e.id === 'collision-filter-effect');
    if (eff) {
      eff.preRender = preRender.bind(eff);
    }
  }
}

const DOWNSCALE = 2;

function preRender(
  this: any,
  { effects: allEffects, layers, layerFilter, viewports, onViewportActive, views, isPicking, preRenderStats = {} }: any
) {
  const { device } = this.context;
  if (isPicking) return;
  const collisionLayers = layers.filter(({ props: { visible, collisionEnabled } }: any) => visible && collisionEnabled);
  if (collisionLayers.length === 0) {
    this.channels = {};
    return;
  }
  const effects = allEffects?.filter((e: any) => e.useInPicking && (preRenderStats as any)[e.id]);
  const maskEffectRendered = (preRenderStats as any)['mask-effect']?.didRender;
  const channels = this._groupByCollisionGroup(device, collisionLayers);
  const viewport = viewports[0];
  const viewportChanged = !this.lastViewport || !this.lastViewport.equals(viewport) || maskEffectRendered;
  for (const collisionGroup in channels) {
    const collisionFBO = this.collisionFBOs[collisionGroup];
    const renderInfo = channels[collisionGroup];
    const width = device.canvasContext.drawingBufferWidth;
    const height = device.canvasContext.drawingBufferHeight;
    collisionFBO.resize({ width: width / DOWNSCALE, height: height / DOWNSCALE });
    this._render(renderInfo, { effects, layerFilter, onViewportActive, views, viewport, viewportChanged });
  }
}
