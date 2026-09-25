import { MAX_IMPORT_FILE_MB } from "@/utils/config";

const MAX_IMPORT_FILE_BYTES = MAX_IMPORT_FILE_MB * 1024 * 1024;

/** What the panel calls a format, which is not one name per extension. */
export type ImportFormat = "KML" | "GeoJSON" | "Shapefile";

/**
 * Extension to the format it carries. A shapefile arrives zipped because the
 * format is several sibling files that only mean anything together, and
 * GeoJSON is published under both of its conventional extensions.
 */
const FORMATS = new Map<string, ImportFormat>([
  [".kml", "KML"],
  [".geojson", "GeoJSON"],
  [".json", "GeoJSON"],
  [".zip", "Shapefile"],
]);

/** The `accept` attribute of the file input. */
export const IMPORT_ACCEPT = [...FORMATS.keys()].join(",");

/** How the panel names the formats, which is not one per extension. */
export const IMPORT_FORMATS_LABEL = "KML, GeoJSON, Shapefile (.zip)";

/** Enough of a file to judge it; `File` satisfies this, so tests need no DOM. */
export type ImportCandidate = { name: string; size: number };

export type ImportRejection = { name: string; reason: string };

const extensionOf = (name: string): string => {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
};

/** The format a file's extension claims, or `null` for one we cannot read. */
export const formatOf = (name: string): ImportFormat | null =>
  FORMATS.get(extensionOf(name)) ?? null;

/** The file name without its extension, which prefills the layer name. */
export const layerNameFromFile = (name: string): string => {
  const dot = name.lastIndexOf(".");
  return (dot > 0 ? name.slice(0, dot) : name).trim();
};

/** Why a file cannot be imported, or `null` when it can. */
export const rejectImportFile = (file: ImportCandidate): string | null => {
  if (!formatOf(file.name))
    return `Unsupported format. Accepts ${IMPORT_FORMATS_LABEL}.`;
  if (file.size > MAX_IMPORT_FILE_BYTES)
    return `Larger than the ${MAX_IMPORT_FILE_MB} MB limit.`;
  if (file.size === 0) return "This file is empty.";
  return null;
};

/**
 * Splits a drop into what may be imported and what may not, so one bad file
 * among several does not sink the rest.
 */
export const triageImportFiles = <T extends ImportCandidate>(
  files: readonly T[],
): { accepted: T[]; rejected: ImportRejection[] } => {
  const accepted: T[] = [];
  const rejected: ImportRejection[] = [];

  for (const file of files) {
    const reason = rejectImportFile(file);
    if (reason) rejected.push({ name: file.name, reason });
    else accepted.push(file);
  }

  return { accepted, rejected };
};
