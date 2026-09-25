/**
 * What a shapefile's `.prj` says its coordinates are in.
 *
 * Only enough of the WKT is read to name the system and tell whether it is
 * already WGS 84 - the conversion itself is proj4's job, inside shpjs.
 */

/** The name the WKT gives its outermost coordinate system. */
export const crsName = (wkt: string): string | null => {
  const named = /\b(?:PROJCS|GEOGCS|GEOGCRS|PROJCRS)\s*\[\s*"([^"]+)"/i.exec(
    wkt,
  );
  // Underscores are how WKT spells spaces: NAD_1983_BC_Environment_Albers.
  return named ? named[1].replace(/_/g, " ").trim() || null : null;
};

/** Whether the file is already in the coordinates the map draws in. */
export const isWgs84 = (wkt: string): boolean => {
  if (/\bPROJCS\s*\[|\bPROJCRS\s*\[/i.test(wkt)) return false;
  const name = crsName(wkt);
  return name !== null && /\bWGS\s*(19)?84\b/i.test(name);
};

/**
 * The system the coordinates were converted from, or `null` when nothing was
 * converted. Named so the warning can say what the file was drawn in.
 */
export const reprojectedFrom = (wkt: string | null): string | null => {
  if (!wkt?.trim() || isWgs84(wkt)) return null;
  return crsName(wkt) ?? "an unnamed coordinate system";
};
