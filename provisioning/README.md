For more information see [Provision dashboards and data sources](https://grafana.com/tutorials/provision-dashboards-and-data-sources/)


## Deck.gl showcase coverage

The repository now includes a first provisioned showcase tranche under `provisioning/dashboards/deckgl-example-*.json`.

Demo dashboards:

- `scatterplot`
- `line`
- `heatmap`
- `3d-heatmap`
- `arc`
- `geojson`
- `highway`
- `text`
- `collision-filter`
- `trips`
- `icon`

Sample data lives under `provisioning/sample-data/deckgl-showcase`.

- Upstream source shape is preserved whenever the plugin can consume it directly.
- GeoJSON URL is preferred for vector examples.
- Small derived fixtures are generated only where Grafana query configuration or plugin semantics would otherwise become brittle.

Refresh the mirrored assets with:

```bash
python3 provisioning/scripts/mirror_deckgl_showcase_data.py phase1
```

- min zoom, max zoom
- xyz tile layer
- picker radius

Icon - preset icons
theme

- heatmap not using color settings
- geojson elevation settings
- Extend the plugin geojson layer to support lineColor from colorScale, not just fill.
- normalization
- clustering

  bearing: initialViewState.bearing + 120,
  transitionDuration: 1000,
  transitionInterpolator: new LinearInterpolator(['bearing']),
  onTransitionEnd: rotateCamera

Extend the plugin geojson layer to support lineColor from colorScale, not just fill.
Add lineWidthField, lineWidthScale, and lineWidthUnits to the geojson layer settings.
Switch the highway dashboard from type: "path" to type: "geojson".

new features

- transitions: { elevationScale: 3000 }
- transitionInterpolator
- flyTo

TODO:

- Panel Settings:
  - map settings
    - bounds
      - fit to current viewport bounding box
      - restrictable map bounds (set to current viewport)
    - flyto interaction
    - navigate game-like controls addEventListener('keydown')
    - map padding
    - minimap
    - Fly to a location based on scroll position
    - clustering

    - maplibre
      - dark/light/auto toggle

  - scatter unit pixels
  - legend not implemented - implement
  - popup not implemented - implement
