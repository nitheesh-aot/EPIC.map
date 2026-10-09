import { WIDGET_ID_PREFIX } from "@/utils/config";

/** Material Icons glyph names, one per EPIC.Track project type. */
export type ProjectGlyph =
  | "terrain"
  | "flash_on"
  | "local_gas_station"
  | "water_drop"
  | "commute"
  | "factory"
  | "delete"
  | "beach_access"
  | "category";

export const WORKS_IN_PROGRESS_COLOR = "#42814a";
export const NO_WORKS_IN_PROGRESS_COLOR = "#2f6fb0";

/** Outer diameter (outline included) and outline width, in CSS pixels. */
export const PROJECT_DOT_SIZES = {
  default: { diameter: 18, outline: 1 },
  selected: { diameter: 23, outline: 1.5 },
} as const;

export type ProjectDotState = keyof typeof PROJECT_DOT_SIZES;

/** The glyph's share of the dot's diameter. */
const GLYPH_SCALE = 0.62;

/** Material's 24-unit viewBox paths, as @mui/icons-material draws them. */
const GLYPH_PATHS: Record<ProjectGlyph, string[]> = {
  terrain: ["m14 6-3.75 5 2.85 3.8-1.6 1.2C9.81 13.75 7 10 7 10l-6 8h22z"],
  flash_on: ["M7 2v11h3v9l7-12h-4l4-8z"],
  local_gas_station: [
    "m19.77 7.23.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77M12 10H6V5h6zm6 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1",
  ],
  water_drop: [
    "M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8M7.83 14c.37 0 .67.26.74.62.41 2.22 2.28 2.98 3.64 2.87.43-.02.79.32.79.75 0 .4-.32.73-.72.75-2.13.13-4.62-1.09-5.19-4.12-.08-.45.28-.87.74-.87",
  ],
  commute: [
    "M12 4H5C3.34 4 2 5.34 2 7v8c0 1.66 1.34 3 3 3l-1 1v1h1l2-2.03L9 18v-5H4V5.98L13 6v2h2V7c0-1.66-1.34-3-3-3M5 14c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1m15.57-4.34c-.14-.4-.52-.66-.97-.66h-7.19c-.46 0-.83.26-.98.66L10 13.77l.01 5.51c0 .38.31.72.69.72h.62c.38 0 .68-.38.68-.76V18h8v1.24c0 .38.31.76.69.76h.61c.38 0 .69-.34.69-.72l.01-1.37v-4.14zm-8.16.34h7.19l1.03 3h-9.25zM12 16c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1m8 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1",
  ],
  factory: [
    "M22 10v12H2V10l7-3v2l5-2v3zm-4.8-1.5L18 2h3l.8 6.5zM11 18h2v-4h-2zm-4 0h2v-4H7zm10-4h-2v4h2z",
  ],
  delete: [
    "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z",
  ],
  beach_access: [
    "m13.127 14.56 1.43-1.43 6.44 6.443L19.57 21zm4.293-5.73 2.86-2.86c-3.95-3.95-10.35-3.96-14.3-.02 3.93-1.3 8.31-.25 11.44 2.88M5.95 5.98c-3.94 3.95-3.93 10.35.02 14.3l2.86-2.86C5.7 14.29 4.65 9.91 5.95 5.98m.02-.02-.01.01c-.38 3.01 1.17 6.88 4.3 10.02l5.73-5.73c-3.13-3.13-7.01-4.68-10.02-4.3",
  ],
  category: [
    "m12 2-5.5 9h11z",
    "M22 17.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 1 1 9 0",
    "M3 13.5h8v8H3z",
  ],
};

/**
 * Track's type names, lower-cased with everything but letters dropped. Track
 * spells them differently from the design ("Energy - Electricity", "Tourist
 * Destination Resort") and has renamed some, so both spellings are listed.
 */
const GLYPHS_BY_TYPE: Record<string, ProjectGlyph> = {
  mines: "terrain",
  energyelectricity: "flash_on",
  energypetroleumnaturalgas: "local_gas_station",
  energyoilandnaturalgas: "local_gas_station",
  watermanagement: "water_drop",
  transportation: "commute",
  industrial: "factory",
  wastedisposal: "delete",
  touristdestinationresort: "beach_access",
  touristdestinationresorts: "beach_access",
  other: "category",
};

const normaliseTypeName = (typeName: string) =>
  typeName.toLowerCase().replace(/[^a-z]/g, "");

/** A type this does not know is drawn as Other rather than left off the map. */
export const glyphForType = (typeName: string | null | undefined): ProjectGlyph =>
  (typeName && GLYPHS_BY_TYPE[normaliseTypeName(typeName)]) || "category";

export const PROJECT_IMAGE_ID_PREFIX = `${WIDGET_ID_PREFIX}project-`;

const toggles = { wip: true, idle: false } as const;

/** One sprite per glyph, colour and state, e.g. `epic-project-terrain-wip-selected`. */
export const projectImageId = (
  glyph: ProjectGlyph,
  hasWorksInProgress: boolean,
  state: ProjectDotState,
) => `${PROJECT_IMAGE_ID_PREFIX}${glyph}-${hasWorksInProgress ? "wip" : "idle"}-${state}`;

export interface ProjectImage {
  glyph: ProjectGlyph;
  hasWorksInProgress: boolean;
  state: ProjectDotState;
}

/** The reverse of projectImageId, or null for an image that is not ours. */
export const parseProjectImageId = (id: string): ProjectImage | null => {
  if (!id.startsWith(PROJECT_IMAGE_ID_PREFIX)) return null;
  const match = /^(.+)-(wip|idle)-(default|selected)$/.exec(
    id.slice(PROJECT_IMAGE_ID_PREFIX.length),
  );
  if (!match) return null;
  const [, glyph, works, state] = match;
  if (!(glyph in GLYPH_PATHS)) return null;
  return {
    glyph: glyph as ProjectGlyph,
    hasWorksInProgress: toggles[works as keyof typeof toggles],
    state: state as ProjectDotState,
  };
};

/** Paint one dot: coloured circle, white outline, white glyph centred. */
export const drawProjectDot = (
  { glyph, hasWorksInProgress, state }: ProjectImage,
  pixelRatio: number,
): ImageData | null => {
  const { diameter, outline } = PROJECT_DOT_SIZES[state];
  const size = Math.ceil(diameter * pixelRatio);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.scale(size / diameter, size / diameter);

  const centre = diameter / 2;
  context.beginPath();
  context.arc(centre, centre, centre - outline / 2, 0, Math.PI * 2);
  context.fillStyle = hasWorksInProgress
    ? WORKS_IN_PROGRESS_COLOR
    : NO_WORKS_IN_PROGRESS_COLOR;
  context.fill();
  context.lineWidth = outline;
  context.strokeStyle = "#ffffff";
  context.stroke();

  const glyphSize = diameter * GLYPH_SCALE;
  context.translate(centre - glyphSize / 2, centre - glyphSize / 2);
  context.scale(glyphSize / 24, glyphSize / 24);
  context.fillStyle = "#ffffff";
  for (const path of GLYPH_PATHS[glyph]) context.fill(new Path2D(path));

  return context.getImageData(0, 0, size, size);
};
