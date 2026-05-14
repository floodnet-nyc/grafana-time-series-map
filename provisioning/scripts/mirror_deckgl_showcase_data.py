#!/usr/bin/env python3
"""Mirror the phase-1 deck.gl showcase assets into local provisioning data."""

from __future__ import annotations

import hashlib
import json
import pathlib
import csv
import urllib.request
from typing import Any

import fire


ROOT = pathlib.Path(__file__).resolve().parents[2]
SAMPLE_ROOT = ROOT / "provisioning" / "sample-data" / "deckgl-showcase"

PHASE1_ASSETS: dict[str, list[dict[str, str]]] = {
    "3d-heatmap": [
        {
            "source": "https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/3d-heatmap/heatmap-data.csv",
            "path": "3d-heatmap/heatmap-data.csv",
        }
    ],
    "arc": [
        {
            "source": "https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/arc/counties.json",
            "path": "arc/counties.json",
        }
    ],
    "collision-filter": [
        {
            "source": "https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/collision-filter/ne_10_roads.json",
            "path": "collision-filter/ne_10_roads.json",
        }
    ],
    "geojson": [
        {
            "source": "https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/geojson/vancouver-blocks.json",
            "path": "geojson/vancouver-blocks.json",
        }
    ],
    "heatmap": [
        {
            "source": "https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/screen-grid/uber-pickup-locations.json",
            "path": "heatmap/uber-pickup-locations.json",
        }
    ],
    "highway": [
        {
            "source": "https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/highway/accidents.csv",
            "path": "highway/accidents.csv",
        },
        {
            "source": "https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/highway/roads.json",
            "path": "highway/roads.json",
        },
    ],
    "icon": [
        {
            "source": "https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/icon/meteorites.json",
            "path": "icon/meteorites.json",
        }
    ],
    "line": [
        {
            "source": "https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/line/airports.json",
            "path": "line/airports.json",
        },
        {
            "source": "https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/line/heathrow-flights.json",
            "path": "line/heathrow-flights.json",
        },
    ],
    "scatterplot": [
        {
            "source": "https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/scatterplot/manhattan.json",
            "path": "scatterplot/manhattan.json",
        }
    ],
    "text": [
        {
            "source": "https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/text-layer/cities-1000.csv",
            "path": "text/cities-1000.csv",
        }
    ],
    "trips": [
        {
            "source": "https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/trips/buildings.json",
            "path": "trips/buildings.json",
        },
        {
            "source": "https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/trips/trips-v7.json",
            "path": "trips/trips-v7.json",
        },
    ],
}


def _sha256(path: pathlib.Path) -> str:
    digest = hashlib.sha256()
    digest.update(path.read_bytes())
    return digest.hexdigest()


def _download(source: str, destination: pathlib.Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(source) as response:
        destination.write_bytes(response.read())


def _read_json(path: pathlib.Path) -> Any:
    return json.loads(path.read_text())


def _write_json(path: pathlib.Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n")


def _feature_collection(features: list[dict[str, Any]]) -> dict[str, Any]:
    return {"type": "FeatureCollection", "features": features}


def _rows(rows: list[dict[str, Any]]) -> dict[str, Any]:
    return {"rows": rows}


def _derive_phase1_assets() -> list[pathlib.Path]:
    written: list[pathlib.Path] = []

    scatterplot_points = _read_json(SAMPLE_ROOT / "scatterplot" / "manhattan.json")
    path = SAMPLE_ROOT / "scatterplot" / "manhattan.rows.json"
    _write_json(
        path,
        _rows([{"lng": point[0], "lat": point[1], "exits": point[2]} for point in scatterplot_points]),
    )
    written.append(path)

    heatmap_points = _read_json(SAMPLE_ROOT / "heatmap" / "uber-pickup-locations.json")
    path = SAMPLE_ROOT / "heatmap" / "uber-pickup-locations.rows.json"
    _write_json(
        path,
        _rows([{"lng": point[0], "lat": point[1], "weight": point[2]} for point in heatmap_points]),
    )
    written.append(path)

    heatmap_csv_path = SAMPLE_ROOT / "3d-heatmap" / "heatmap-data.csv"
    with heatmap_csv_path.open() as handle:
        reader = csv.DictReader(handle)
        heatmap_rows = [
            {"lng": float(row["lng"]), "lat": float(row["lat"])}
            for row in reader
            if row.get("lng") and row.get("lat")
        ]
    path = SAMPLE_ROOT / "3d-heatmap" / "heatmap-data.rows.json"
    _write_json(path, _rows(heatmap_rows))
    written.append(path)

    airports = _read_json(SAMPLE_ROOT / "line" / "airports.json")
    path = SAMPLE_ROOT / "line" / "airports.rows.json"
    _write_json(
        path,
        _rows(
            [
                {
                    "type": row["type"],
                    "name": row["name"],
                    "abbrev": row["abbrev"],
                    "lng": row["coordinates"][0],
                    "lat": row["coordinates"][1],
                }
                for row in airports
            ]
        ),
    )
    written.append(path)

    flights = _read_json(SAMPLE_ROOT / "line" / "heathrow-flights.json")
    path = SAMPLE_ROOT / "line" / "heathrow-flights.rows.json"
    _write_json(
        path,
        _rows(
            [
                {
                    "name": row["name"],
                    "country": row["country"],
                    "srcLng": row["start"][0],
                    "srcLat": row["start"][1],
                    "srcAlt": row["start"][2],
                    "tgtLng": row["end"][0],
                    "tgtLat": row["end"][1],
                    "tgtAlt": row["end"][2],
                }
                for row in flights
            ]
        ),
    )
    written.append(path)

    meteorites = _read_json(SAMPLE_ROOT / "icon" / "meteorites.json")
    path = SAMPLE_ROOT / "icon" / "meteorites.rows.json"
    _write_json(
        path,
        _rows(
            [
                {
                    "name": row["name"],
                    "class": row["class"],
                    "mass": float(row["mass"]) if row.get("mass") else 0,
                    "year": int(row["year"]) if row.get("year") else None,
                    "lng": row["coordinates"][0],
                    "lat": row["coordinates"][1],
                }
                for row in meteorites
            ]
        ),
    )
    written.append(path)

    counties_geojson = _read_json(SAMPLE_ROOT / "arc" / "counties.json")
    counties = counties_geojson["features"]
    selected_county = next(feature for feature in counties if feature["properties"]["name"] == "Los Angeles, CA")
    flows = []
    for index, value in selected_county["properties"]["flows"].items():
      target = counties[int(index)]
      flows.append(
          {
              "sourceCounty": selected_county["properties"]["name"],
              "targetCounty": target["properties"]["name"],
              "srcLng": selected_county["properties"]["centroid"][0],
              "srcLat": selected_county["properties"]["centroid"][1],
              "tgtLng": target["properties"]["centroid"][0],
              "tgtLat": target["properties"]["centroid"][1],
              "value": value,
              "absValue": abs(value),
          }
      )
    path = SAMPLE_ROOT / "arc" / "los-angeles-flows.json"
    _write_json(path, _rows(flows))
    written.append(path)

    roads_geojson = _read_json(SAMPLE_ROOT / "collision-filter" / "ne_10_roads.json")
    label_features = []
    for feature in roads_geojson["features"]:
        name = feature["properties"].get("name")
        if not name:
            continue
        coordinates = feature["geometry"]["coordinates"]
        midpoint = coordinates[len(coordinates) // 2]
        label_features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": midpoint},
                "properties": {
                    "name": name,
                    "scalerank": feature["properties"].get("scalerank", 1),
                },
            }
        )
    path = SAMPLE_ROOT / "collision-filter" / "road-labels.geojson"
    _write_json(path, _feature_collection(label_features))
    written.append(path)

    text_csv_path = SAMPLE_ROOT / "text" / "cities-1000.csv"
    with text_csv_path.open() as handle:
        reader = csv.DictReader(handle)
        text_rows = [
            {
                "name": row["name"],
                "population": int(row["population"]),
                "lng": float(row["longitude"]),
                "lat": float(row["latitude"]),
            }
            for row in reader
        ]
    path = SAMPLE_ROOT / "text" / "cities-1000.rows.json"
    _write_json(path, _rows(text_rows))
    written.append(path)

    buildings = _read_json(SAMPLE_ROOT / "trips" / "buildings.json")
    building_features = []
    for index, building in enumerate(buildings):
        building_features.append(
            {
                "type": "Feature",
                "id": index,
                "geometry": {"type": "Polygon", "coordinates": [building["polygon"]]},
                "properties": {"height": building["height"]},
            }
        )
    path = SAMPLE_ROOT / "trips" / "buildings.geojson"
    _write_json(path, _feature_collection(building_features))
    written.append(path)

    trips = _read_json(SAMPLE_ROOT / "trips" / "trips-v7.json")
    trip_features = []
    for index, trip in enumerate(trips):
        trip_features.append(
            {
                "type": "Feature",
                "id": index,
                "geometry": {"type": "LineString", "coordinates": trip["path"]},
                "properties": {
                    "vendor": trip["vendor"],
                    "timestamps": trip["timestamps"],
                },
            }
        )
    path = SAMPLE_ROOT / "trips" / "trips-v7.geojson"
    _write_json(path, _feature_collection(trip_features))
    written.append(path)

    accidents_path = SAMPLE_ROOT / "highway" / "accidents.csv"
    accidents_1990: dict[tuple[str, str, str], dict[str, int]] = {}
    with accidents_path.open() as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            if row["year"] != "1990":
                continue
            accidents_1990[(row["state"], row["type"], row["id"])] = {
                "year": 1990,
                "incidents": int(row["incidents"]),
                "fatalities": int(row["fatalities"]),
            }
    roads = _read_json(SAMPLE_ROOT / "highway" / "roads.json")
    road_features = []
    for feature in roads["features"]:
        props = feature["properties"]
        extra = accidents_1990.get((props["state"], props["type"], props["id"]), {"year": 1990, "incidents": 0, "fatalities": 0})
        length = float(props.get("length") or 0)
        incidents_per_1k_mile = (extra["incidents"] / length * 1000) if length else 0
        fatalities_per_1k_mile = (extra["fatalities"] / length * 1000) if length else 0
        base_properties = {
            **props,
            **extra,
            "incidentsPer1kMile": incidents_per_1k_mile,
            "fatalitiesPer1kMile": fatalities_per_1k_mile,
        }
        geometry = feature["geometry"]
        if geometry["type"] == "MultiLineString":
            for segment_index, coordinates in enumerate(geometry["coordinates"]):
                road_features.append(
                    {
                        "type": "Feature",
                        "geometry": {"type": "LineString", "coordinates": coordinates},
                        "properties": {
                            **base_properties,
                            "segmentIndex": segment_index,
                        },
                    }
                )
            continue
        road_features.append(
            {
                "type": "Feature",
                "geometry": geometry,
                "properties": base_properties,
            }
        )
    path = SAMPLE_ROOT / "highway" / "roads-1990.geojson"
    _write_json(path, _feature_collection(road_features))
    written.append(path)

    return written


class MirrorDeckGlShowcaseData:
    """Mirror deck.gl showcase inputs into provisioning/sample-data."""

    def phase1(self) -> dict[str, Any]:
        """Download the phase-1 showcase data and write a manifest."""
        files: list[dict[str, Any]] = []
        for example_name, assets in PHASE1_ASSETS.items():
            for asset in assets:
                destination = SAMPLE_ROOT / asset["path"]
                _download(asset["source"], destination)
                files.append(
                    {
                        "example": example_name,
                        "path": str(destination.relative_to(ROOT)),
                        "source": asset["source"],
                        "sha256": _sha256(destination),
                    }
                )

        derived_paths = _derive_phase1_assets()
        for destination in derived_paths:
            files.append(
                {
                    "example": "derived",
                    "path": str(destination.relative_to(ROOT)),
                    "source": "derived-from-phase1-upstream-assets",
                    "sha256": _sha256(destination),
                }
            )

        manifest = {
            "examples": sorted(PHASE1_ASSETS),
            "files": files,
        }
        manifest_path = SAMPLE_ROOT / "manifest.phase1.json"
        manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
        return {
            "manifest": str(manifest_path.relative_to(ROOT)),
            "downloaded": len(files),
        }


if __name__ == "__main__":
    fire.Fire(MirrorDeckGlShowcaseData)
