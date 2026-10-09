import type { FeatureCollection, Point } from "geojson";
import type {
  ExpressionSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
  MapStyleImageMissingEvent,
  PointLike,
} from "maplibre-gl";
import { whenStyleReady } from "@/components/Layers/layerUtils";
import {
  drawProjectDot,
  parseProjectImageId,
  PROJECT_IMAGE_ID_PREFIX,
  type ProjectGlyph,
} from "@/components/Projects/projectIcons";
import type { ProjectPoint } from "@/api/useProjects";
import { WIDGET_ID_PREFIX } from "@/utils/config";

export const PROJECTS_SOURCE_ID = `${WIDGET_ID_PREFIX}projects`;
export const PROJECTS_LAYER_ID = `${WIDGET_ID_PREFIX}projects-dots`;

/** A project feature with its glyph worked out, ready to draw. */
export type DrawnProjectPoint = ProjectPoint & { glyph: ProjectGlyph };

const NO_PROJECT = -1;

const isSelected = (selectedId: number | null): ExpressionSpecification => [
  "==",
  ["id"],
  selectedId ?? NO_PROJECT,
];

const hasWorksInProgress: ExpressionSpecification = [
  "to-boolean",
  ["get", "hasWorksInProgress"],
];

/** Matches projectImageId, so each image is made on first use. */
export const projectIconImage = (
  selectedId: number | null,
): ExpressionSpecification => [
  "concat",
  PROJECT_IMAGE_ID_PREFIX,
  ["get", "glyph"],
  "-",
  ["case", hasWorksInProgress, "wip", "idle"],
  "-",
  ["case", isSelected(selectedId), "selected", "default"],
];

/** Higher draws later, so on top: green over blue, the selected dot over both. */
export const projectSortKey = (
  selectedId: number | null,
): ExpressionSpecification => [
  "+",
  ["case", hasWorksInProgress, 1, 0],
  ["case", isSelected(selectedId), 2, 0],
];

export const showProjects = (
  map: MapLibreMap,
  data: FeatureCollection<Point, DrawnProjectPoint>,
  selectedId: number | null,
) => {
  whenStyleReady(map, () => {
    const source = map.getSource<GeoJSONSource>(PROJECTS_SOURCE_ID);
    if (source) {
      source.setData(data);
    } else {
      map.addSource(PROJECTS_SOURCE_ID, { type: "geojson", data });
    }
    if (map.getLayer(PROJECTS_LAYER_ID)) return;

    map.addLayer({
      id: PROJECTS_LAYER_ID,
      type: "symbol",
      source: PROJECTS_SOURCE_ID,
      layout: {
        "icon-image": projectIconImage(selectedId),
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "symbol-sort-key": projectSortKey(selectedId),
      },
    });
  });
};

export const setSelectedProject = (
  map: MapLibreMap,
  selectedId: number | null,
) => {
  if (!map.getLayer(PROJECTS_LAYER_ID)) return;
  map.setLayoutProperty(
    PROJECTS_LAYER_ID,
    "icon-image",
    projectIconImage(selectedId),
  );
  map.setLayoutProperty(
    PROJECTS_LAYER_ID,
    "symbol-sort-key",
    projectSortKey(selectedId),
  );
};

/** Layers added later (catalogue, imported) would otherwise cover the dots. */
export const keepProjectsOnTop = (map: MapLibreMap) => {
  const order = map.getLayersOrder();
  if (order.includes(PROJECTS_LAYER_ID) && order.at(-1) !== PROJECTS_LAYER_ID) {
    map.moveLayer(PROJECTS_LAYER_ID);
  }
};

/** Draws a dot the first time the map asks for it, including after a basemap switch. */
export const addMissingProjectImage = (
  map: MapLibreMap,
  event: MapStyleImageMissingEvent,
) => {
  const image = parseProjectImageId(event.id);
  if (!image || map.hasImage(event.id)) return;
  const pixelRatio = map.getPixelRatio();
  const data = drawProjectDot(image, pixelRatio);
  if (data) map.addImage(event.id, data, { pixelRatio });
};

/** The project under a point, preferring the one drawn on top. */
export const projectIdAt = (
  map: MapLibreMap,
  point: PointLike,
): number | null => {
  if (!map.getLayer(PROJECTS_LAYER_ID)) return null;
  const hits = map.queryRenderedFeatures(point, { layers: [PROJECTS_LAYER_ID] });
  const top =
    hits.find((hit) => hit.properties?.hasWorksInProgress === true) ?? hits[0];
  return typeof top?.id === "number" ? top.id : null;
};
