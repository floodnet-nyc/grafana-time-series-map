# Layer Dataflow Proposal

## Problem

The current layer model is good at rendering a single query as map features, plus one special-case keyed as-of lookup.

That breaks down for layers like `flood-inundation`, which need all of the following at once:

- a primary spatial dataframe
- a secondary time-varying dataframe
- a keyed as-of join between them
- one or more derived values computed from joined attributes
- renderer access to those derived values without materializing a cross-join

Today that behavior is split awkwardly across:

- `LayerConfig.queryRefId`
- `LayerConfig.timeFilter`
- `LayerConfig.lookup`
- hardcoded renderer math in `src/layers/floodinundation/index.ts`

That makes the behavior hard to generalize and hard to reuse in other layers.

## Goals

- Keep the current "single source layer" workflow simple.
- Support one primary source plus zero or more secondary keyed sources.
- Support time-aware joins without creating a cross-join.
- Support reusable derived fields that can drive color, elevation, labels, or filters.
- Keep the model general enough for more than flood inundation.

## Non-goals

- Do not execute arbitrary JavaScript from panel config.
- Do not turn `timeFilter` into a join configuration block.
- Do not require renderers to understand query/frame internals.

## Proposed model

### 1. Primary source stays explicit

The layer still has one primary feature source. This remains the source that produces renderable features.

Current state:

- `queryRefId`
- `geometry`
- `timeFilter`

That can remain in place for compatibility and editor simplicity.

### 2. Add named secondary sources

Instead of a single `lookup`, allow multiple named secondary sources.

```ts
interface LayerSecondarySourceConfig {
  id: string;
  queryRefId: string;
  join: {
    type: 'asof';
    localKeyField: string;
    remoteKeyField: string;
    timeField: string;
    maxLagMs?: number;
  };
  fields: Array<{
    sourceField: string;
    as: string;
  }>;
}
```

This is the generalized form of the current `lookup` block:

- `localKeyField` is read from the primary feature
- `remoteKeyField` and `timeField` are read from the secondary query
- `fields` define which resolved fields are exposed under the secondary source namespace

The existing packed as-of logic in `src/hooks/panelLayersModel.ts` is already close to what this needs. The main change is to make it source-oriented instead of `lookup`-oriented.

### 3. Add derived fields

Derived fields are evaluated after secondary sources are resolved and joined onto a primary feature.

```ts
interface DerivedFieldConfig {
  as: string;
  expression: string;
  type?: 'number' | 'string' | 'boolean';
}
```

The expression language should be small and deterministic:

- field references with namespaces
- arithmetic: `+`, `-`, `*`, `/`
- parentheses
- a small standard library later if needed: `min`, `max`, `abs`, `clamp`

Examples:

- `sensor.currentDepthInches - primary.contourDepthInches`
- `sensor.stageFt * 12`
- `primary.threshold + sensor.margin`

Raw JavaScript should not be the first implementation. It is too open-ended for config safety, caching, debugging, and future optimization.

## Resulting per-feature value model

After joins and derived field evaluation, each primary feature gets an associated value scope:

```ts
{
  primary: {
    contourDepthInches: 24
  },
  sensor: {
    currentDepthInches: 30
  },
  derived: {
    depthDiff: 6
  }
}
```

Renderers should not have to rebuild this scope themselves. The panel layer preparation pipeline should hand them ready-to-read values.

## Renderer contract changes

The existing renderer context includes:

- `features`
- `timeFilterFlags`
- `lookupValues`

This should evolve toward:

```ts
interface LayerRenderContext {
  ...
  featureValues?: Map<number, {
    primary: Record<string, unknown>;
    sources: Record<string, Record<string, unknown>>;
    derived: Record<string, unknown>;
  }>;
}
```

Notes:

- `number` is the feature index (`feature.__idx`)
- `primary` is a normalized view of feature properties
- `sources` is keyed by secondary source id
- `derived` contains computed values by alias

This keeps renderers independent from dataframe implementation details.

## Flood inundation under this model

The current flood inundation layer is effectively:

- primary source: contour polygons
- secondary source: sensor readings
- join: keyed as-of on deployment/sensor id
- derived value: `depthDiff = sensor.currentDepthInches - primary.contourDepthInches`

That would look like:

```ts
{
  queryRefId: 'contours',
  geometry: { type: 'wkb', field: 'geom' },
  secondarySources: [
    {
      id: 'sensor',
      queryRefId: 'readings',
      join: {
        type: 'asof',
        localKeyField: 'deployment_id',
        remoteKeyField: 'deployment_id',
        timeField: 'time',
        maxLagMs: 600000
      },
      fields: [
        { sourceField: 'depth_inches', as: 'currentDepthInches' }
      ]
    }
  ],
  derivedFields: [
    {
      as: 'depthDiff',
      expression: 'sensor.currentDepthInches - primary.contourDepthInches',
      type: 'number'
    }
  ]
}
```

Then the flood inundation renderer becomes mostly a presentation layer:

- fill color by `derived.depthDiff`
- elevation by `derived.depthDiff` or another derived value
- opacity by style config

That is a better separation than hardcoding `currentDepth - contourDepth` inside the renderer.

## Implementation plan

### Phase 1: Generalize keyed secondary sources

Add a new optional `secondarySources` config alongside the existing `lookup`.

Work:

- extend `LayerConfig`
- build packed secondary sources by layer and by source id
- resolve keyed as-of source values at cursor time
- expose those values in prepared layer state

Keep `lookup` working as a compatibility shim for now.

### Phase 2: Add a small expression engine

Add `derivedFields` with a constrained expression language.

Work:

- parse expressions once
- evaluate them per feature after source joins resolve
- store results in prepared feature values

Important:

- no `eval`
- no `new Function`
- no direct access to globals

### Phase 3: Expose prepared feature values to renderers

Update `LayerRenderContext` so renderers can read:

- primary feature values
- joined secondary values
- derived values

At this point, migrate `flood-inundation` off the legacy `lookupValues` path.

### Phase 4: Editor changes

Add editor support in layers for:

- secondary sources
- keyed join configuration
- derived field expressions

This should likely live under a new `Dataflow` section rather than overloading `Time`.

## Why this is generally useful

This model supports more than flood inundation:

- polygons joined to latest telemetry
- asset points joined to current health/status
- lines joined to route metrics
- renderer values derived from multiple queries
- ratio, delta, margin, or normalized score calculations

That makes it a real layer dataflow feature rather than a flood-specific escape hatch.

## Recommendation

The first implementation should be:

- one primary source
- zero or more `asof` secondary sources
- small derived expression language
- prepared per-feature value scopes in the render context

It should not start with:

- arbitrary JavaScript
- cross-join materialization
- stuffing joins into `timeFilter`
- renderer-specific ad hoc join logic
