import type { Feature, FeatureCollection, Position } from "geojson";
import {
  formatOf,
  IMPORT_FORMATS_LABEL,
  type ImportFormat,
} from "@/components/Layers/UserLayers/importFile";
import { reprojectedFrom } from "@/components/Layers/UserLayers/projection";
import type { MapExtent } from "@/types";

/** What the panel reports about a file, once it has been read. */
export type ParsedImport = {
  format: ImportFormat;
  geojson: FeatureCollection;
  geometryType: string;
  featureCount: number;
  bounds: MapExtent | null;
  reprojectedFrom: string | null;
};

/** What a reader hands back: the GeoJSON, and what it had to do to get there. */
type ReadFile = {
  data: unknown;
  reprojectedFrom: string | null;
};

const GEOMETRY_LABELS: Record<string, string> = {
  Point: "Point",
  MultiPoint: "Point",
  LineString: "Line",
  MultiLineString: "Line",
  Polygon: "Polygon",
  MultiPolygon: "Polygon",
};

/** One label for the file, or "Mixed" when its features disagree. */
export const geometrySummary = (features: readonly Feature[]): string => {
  const labels = new Set(
    features.map(
      (feature) => GEOMETRY_LABELS[feature.geometry?.type ?? ""] ?? "Mixed",
    ),
  );
  if (labels.size === 0) return "None";
  return labels.size === 1 ? [...labels][0] : "Mixed";
};

const isPosition = (value: unknown): value is Position =>
  Array.isArray(value) &&
  typeof value[0] === "number" &&
  typeof value[1] === "number";

/** The extent of everything in the file, walked rather than trusted to `bbox`. */
export const geoBounds = (features: readonly Feature[]): MapExtent | null => {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;

  const visit = (coordinates: unknown): void => {
    if (isPosition(coordinates)) {
      const [x, y] = coordinates;
      west = Math.min(west, x);
      south = Math.min(south, y);
      east = Math.max(east, x);
      north = Math.max(north, y);
      return;
    }
    if (Array.isArray(coordinates)) coordinates.forEach(visit);
  };

  for (const feature of features) {
    const geometry = feature.geometry;
    if (!geometry) continue;
    if (geometry.type === "GeometryCollection")
      geometry.geometries.forEach((inner) =>
        visit("coordinates" in inner ? inner.coordinates : null),
      );
    else visit(geometry.coordinates);
  }

  return west === Infinity ? null : [west, south, east, north];
};

const isFeature = (value: unknown): value is Feature =>
  !!value && typeof value === "object" && (value as Feature).type === "Feature";

/**
 * Everything a parser may hand back, flattened into one collection: a bare
 * geometry, a single feature, or - from a zip holding several shapefiles - an
 * array of collections.
 */
export const asFeatureCollection = (value: unknown): FeatureCollection => {
  const features: Feature[] = [];

  const visit = (candidate: unknown): void => {
    if (Array.isArray(candidate)) {
      candidate.forEach(visit);
      return;
    }
    if (!candidate || typeof candidate !== "object") return;

    const entry = candidate as { type?: string; features?: unknown };
    if (entry.type === "FeatureCollection") visit(entry.features);
    else if (isFeature(entry)) features.push(entry);
    else if (entry.type)
      // A bare geometry, which GeoJSON allows as a whole document.
      features.push({
        type: "Feature",
        geometry: candidate as Feature["geometry"],
        properties: {},
      });
  };

  visit(value);
  return { type: "FeatureCollection", features };
};

const unreadable = (format: ImportFormat) =>
  new Error(`This file could not be read as ${format}.`);

/** GeoJSON is WGS 84 by specification, so nothing is ever converted. */
const readGeoJson = async (file: File): Promise<ReadFile> => {
  try {
    return { data: JSON.parse(await file.text()), reprojectedFrom: null };
  } catch {
    throw unreadable("GeoJSON");
  }
};

/** KML is WGS 84 by specification, the same way GeoJSON is. */
const readKml = async (file: File): Promise<ReadFile> => {
  // Loaded on demand: the parsers are only worth their weight to someone who
  // is actually importing a file.
  const { kml } = await import("@tmcw/togeojson");
  const document = new DOMParser().parseFromString(
    await file.text(),
    "application/xml",
  );
  if (document.getElementsByTagName("parsererror").length)
    throw unreadable("KML");
  return { data: kml(document), reprojectedFrom: null };
};

/** A zip entry macOS adds beside the real one, holding none of its data. */
const isMacMetadata = (filename: string) => filename.includes("__MACOSX");

/**
 * The `.prj` beside the shapefile, and whether there is a shapefile at all.
 *
 * shpjs reads the zip itself but says nothing about what it found, and the
 * difference between "converted from BC Albers" and "there was no coordinate
 * system to convert from" is the difference between a warning and a refusal.
 */
const readZipContents = async (
  bytes: Uint8Array,
): Promise<{ hasShapefile: boolean; prj: string | null }> => {
  const { iter } = await import("but-unzip");

  let hasShapefile = false;
  let prj: string | null = null;

  for (const entry of iter(bytes)) {
    if (isMacMetadata(entry.filename)) continue;
    const filename = entry.filename.toLowerCase();
    if (filename.endsWith(".shp")) hasShapefile = true;
    else if (filename.endsWith(".prj"))
      prj = new TextDecoder().decode(await entry.read());
  }

  return { hasShapefile, prj };
};

const readShapefile = async (file: File): Promise<ReadFile> => {
  const bytes = new Uint8Array(await file.arrayBuffer());

  let contents: { hasShapefile: boolean; prj: string | null };
  try {
    contents = await readZipContents(bytes);
  } catch {
    throw unreadable("Shapefile");
  }

  if (contents.hasShapefile && !contents.prj)
    throw new Error(
      "No coordinate system was found. Re-export the shapefile.",
    );

  const { parseZip } = await import("shpjs");
  try {
    return {
      data: await parseZip(bytes),
      reprojectedFrom: reprojectedFrom(contents.prj),
    };
  } catch {
    throw unreadable("Shapefile");
  }
};

const READERS: Record<ImportFormat, (file: File) => Promise<ReadFile>> = {
  GeoJSON: readGeoJson,
  KML: readKml,
  Shapefile: readShapefile,
};

/**
 * Reads a dropped file into the features the preview draws and the summary
 * counts. Coordinates come back in WGS84 — shpjs reprojects from the `.prj`
 * beside the shapefile, and the other two formats are WGS84 by definition.
 */
export const parseImportFile = async (file: File): Promise<ParsedImport> => {
  const format = formatOf(file.name);
  if (!format) throw new Error(`Accepts ${IMPORT_FORMATS_LABEL}.`);

  const read = await READERS[format](file);
  const geojson = asFeatureCollection(read.data);
  if (geojson.features.length === 0)
    throw new Error("This file holds no features to import.");

  return {
    format,
    geojson,
    geometryType: geometrySummary(geojson.features),
    featureCount: geojson.features.length,
    bounds: geoBounds(geojson.features),
    reprojectedFrom: read.reprojectedFrom,
  };
};
