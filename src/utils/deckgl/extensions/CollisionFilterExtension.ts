// +++ Use the local collision extension implementation instead of the stock
// +++ `@deck.gl/extensions` export so we can carry shader/effect fixes here
// +++ and later migrate them back upstream in one place.
import CollisionFilterExtension_ from '../../../extensions/collision/collision-filter/collision-filter-extension';


class CollisionFilterExtension extends CollisionFilterExtension_ {
  initializeState(this: any, context: any, extension: any) {
    super.initializeState(context, extension);
    const eff = context.deck.effectManager.getEffects().find((e: any) => e.id === 'collision-filter-effect');
    if (eff) {
      // +++ Patch the collision effect's preRender hook so our local downscale /
      // +++ framebuffer sizing behavior is used for layers that import this wrapper.
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


// preRender({
//     effects: allEffects,
//     layers,
//     layerFilter,
//     viewports,
//     onViewportActive,
//     views,
//     isPicking,
//     preRenderStats = {}
//   }: PreRenderOptions): void {
//     // This can only be called in preRender() after setup() where context is populated
//     const {device} = this.context!;

//     if (isPicking) {
//       // Do not update on picking pass
//       return;
//     }

//     const collisionLayers = layers.filter(
//       // @ts-ignore
//       ({props: {visible, collisionEnabled}}) => visible && collisionEnabled
//     ) as Layer<CollisionFilterExtensionProps>[];
//     if (collisionLayers.length === 0) {
//       this.channels = {};
//       return;
//     }

//     // Detect if mask has rendered. TODO: better dependency system for Effects
//     const effects = allEffects?.filter(e => e.useInPicking && preRenderStats[e.id]);
//     const maskEffectRendered = (preRenderStats['mask-effect'] as MaskPreRenderStats)?.didRender;

//     // Collect layers to render
//     const channels = this._groupByCollisionGroup(device, collisionLayers);

//     const viewport = viewports[0];
//     const viewportChanged =
//       !this.lastViewport || !this.lastViewport.equals(viewport) || maskEffectRendered;

//     // Resize framebuffers to match canvas
//     for (const collisionGroup in channels) {
//       const collisionFBO = this.collisionFBOs[collisionGroup];
//       const renderInfo = channels[collisionGroup];
//       // @ts-expect-error TODO - assuming WebGL context
//       const [width, height] = device.canvasContext.getPixelSize();
//       collisionFBO.resize({
//         width: width / DOWNSCALE,
//         height: height / DOWNSCALE
//       });
//       this._render(renderInfo, {
//         effects,
//         layerFilter,
//         onViewportActive,
//         views,
//         viewport,
//         viewportChanged
//       });
//     }

//     // debugFBO(this.collisionFBOs[Object.keys(channels)[0]], {minimap: true});
//   }

// +++ Export the wrapped local subclass, not the stock extension class. This is
// +++ required for the shader/effect fixes below to actually take effect.
export default CollisionFilterExtension;
