import { useEffect, useMemo, useRef } from "react";
import type { FeatureCollection } from "geojson";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useQueries, type UseQueryResult } from "@tanstack/react-query";
import { alpha, useTheme } from "@mui/material/styles";
import {
  IMPORTED_LAYERS_PATH,
  type ImportedLayer,
} from "@/api/useImportedLayers";
import {
  removeImportedLayer,
  showImportedLayer,
} from "@/components/Layers/layerUtils";
import { epicMapQueryKey } from "@/utils/queryKeys";
import { useMapWidget } from "@/widget/MapWidgetContext";

/** Stable, so the combined result keeps its identity until a layer's data changes. */
const featuresOnly = (results: UseQueryResult<FeatureCollection>[]) =>
  results.map((result) => result.data ?? null);

/**
 * Keeps the user's imported layers drawn on the map.
 *
 * Features are fetched once per layer and kept: a layer's features never
 * change after upload, and a basemap switch carries the drawn source across.
 */
export const useImportedLayersOnMap = (
  map: MapLibreMap | null,
  layers: readonly ImportedLayer[],
) => {
  const { api } = useMapWidget();
  const theme = useTheme();

  const features = useQueries({
    queries: layers.map((layer) => ({
      queryKey: epicMapQueryKey(
        "users",
        "me",
        "imported-layers",
        layer.id,
        "features",
      ),
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        const response = await api.get<FeatureCollection>(
          `${IMPORTED_LAYERS_PATH}/${layer.id}/features`,
          { signal },
        );
        return response.data;
      },
      staleTime: Infinity,
      retry: false,
    })),
    combine: featuresOnly,
  });

  const colors = useMemo(
    () => ({
      line: theme.palette.primary.main,
      fill: alpha(theme.palette.primary.main, 0.35),
    }),
    [theme],
  );

  const drawn = useRef(new Set<string>());

  // A new map starts empty, whatever the last one had on it.
  useEffect(() => {
    const onMap = drawn.current;
    return () => onMap.clear();
  }, [map]);

  useEffect(() => {
    if (!map) return;

    const wanted = new Set(layers.map((layer) => layer.id));
    for (const id of drawn.current) {
      if (wanted.has(id)) continue;
      removeImportedLayer(map, id);
      drawn.current.delete(id);
    }

    layers.forEach((layer, index) => {
      const data = features[index];
      if (!data || drawn.current.has(layer.id)) return;
      showImportedLayer(map, layer.id, data, colors);
      drawn.current.add(layer.id);
    });
  }, [map, layers, features, colors]);
};
