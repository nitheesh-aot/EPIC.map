import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import {
  useImportedLayers,
  useLayerUploads,
  type ImportedLayer,
} from "@/api/useImportedLayers";
import type { ImportDraft } from "@/components/Layers/UserLayers/ImportFileDialog";
import type { UploadRow } from "@/components/Layers/UserLayers/uploadUtils";
import { useImportedLayersOnMap } from "@/components/Layers/UserLayers/useImportedLayersOnMap";

interface ImportedLayersContextValue {
  /** The layers map-api has stored for this user, newest first. */
  layers: readonly ImportedLayer[];
  pending: boolean;
  error: unknown;
  retry: () => void;
  uploads: readonly UploadRow[];
  /** Names a new layer may not take: stored layers and ones still uploading. */
  takenNames: readonly string[];
  startUpload: (draft: ImportDraft) => void;
  cancelUpload: (id: string) => void;
  retryUpload: (id: string) => void;
  dismissUpload: (id: string) => void;
}

const ImportedLayersContext = createContext<ImportedLayersContextValue | null>(
  null,
);

/**
 * The user's imported layers and the uploads adding to them.
 *
 * Its own context rather than part of LayersContext: an upload reports
 * progress many times a second, and every catalogue and favourite row reads
 * LayersContext. Mounted with the map rather than the panel, so closing the
 * panel neither abandons an upload nor takes the layers off the map.
 */
export function ImportedLayersProvider({
  map,
  children,
}: {
  map: MapLibreMap | null;
  children: ReactNode;
}) {
  const { layers, isPending, error, retry, addLayer } = useImportedLayers();
  const { uploads, startUpload, cancelUpload, retryUpload, dismissUpload } =
    useLayerUploads(addLayer);

  useImportedLayersOnMap(map, layers);

  const takenNames = useMemo(
    () => [
      ...layers.map((layer) => layer.name),
      ...uploads.map((upload) => upload.layerName),
    ],
    [layers, uploads],
  );

  const value = useMemo(
    () => ({
      layers,
      pending: isPending,
      error,
      retry: () => void retry(),
      uploads,
      takenNames,
      startUpload,
      cancelUpload,
      retryUpload,
      dismissUpload,
    }),
    [
      layers,
      isPending,
      error,
      retry,
      uploads,
      takenNames,
      startUpload,
      cancelUpload,
      retryUpload,
      dismissUpload,
    ],
  );

  return (
    <ImportedLayersContext.Provider value={value}>
      {children}
    </ImportedLayersContext.Provider>
  );
}

export const useImportedLayersContext = (): ImportedLayersContextValue => {
  const value = useContext(ImportedLayersContext);
  if (!value) {
    throw new Error(
      "useImportedLayersContext must be used inside an ImportedLayersProvider",
    );
  }
  return value;
};
