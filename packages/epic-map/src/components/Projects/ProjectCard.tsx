import { useState, type ElementType } from "react";
import axios from "axios";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Skeleton,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import CategoryIcon from "@mui/icons-material/Category";
import CloseIcon from "@mui/icons-material/Close";
import CommuteIcon from "@mui/icons-material/Commute";
import DeleteIcon from "@mui/icons-material/Delete";
import FactoryIcon from "@mui/icons-material/Factory";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import TerrainIcon from "@mui/icons-material/Terrain";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import { useProject, type ProjectPoint } from "@/api/useProjects";
import {
  glyphForType,
  type ProjectGlyph,
} from "@/components/Projects/projectIcons";
import { PROJECT_CARD_WIDTH_PX } from "@/utils/config";

const GLYPH_ICONS: Record<ProjectGlyph, ElementType> = {
  terrain: TerrainIcon,
  flash_on: FlashOnIcon,
  local_gas_station: LocalGasStationIcon,
  water_drop: WaterDropIcon,
  commute: CommuteIcon,
  factory: FactoryIcon,
  delete: DeleteIcon,
  beach_access: BeachAccessIcon,
  category: CategoryIcon,
};

const CERTIFICATE_COLOR = "#42814a";

const DESCRIPTION_LINES = 3;

type ProjectCardProps = {
  projectId: number;
  /** The dot's own properties, shown while the rest of the card loads. */
  point: ProjectPoint | null;
  onClose: () => void;
};

/** The selected project, docked on the map's right edge. */
export default function ProjectCard({
  projectId,
  point,
  onClose,
}: ProjectCardProps) {
  const theme = useTheme();
  const { data: project, error, isLoading } = useProject(projectId);
  const [expanded, setExpanded] = useState(false);

  const name = project?.name ?? point?.name;
  const typeName = project?.typeName ?? point?.typeName ?? null;
  const TypeIcon = GLYPH_ICONS[glyphForType(typeName)];
  const notOpen =
    axios.isAxiosError(error) && error.response?.status === 404;

  const chipSx = {
    height: "1.5rem",
    borderRadius: "0.25rem",
    fontSize: "0.75rem",
    "& .MuiChip-icon": { fontSize: "0.875rem", color: "inherit" },
  };

  return (
    <Box
      role="dialog"
      aria-labelledby="epic-map-project-title"
      sx={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        zIndex: 3,
        display: "flex",
        flexDirection: "column",
        width: `${PROJECT_CARD_WIDTH_PX}px`,
        maxWidth: "100%",
        backgroundColor: theme.palette.background.paper,
        borderLeft: `1px solid ${theme.palette.divider}`,
        boxShadow: theme.shadows[4],
        overflowY: "auto",
      }}
    >
      <Box sx={{ padding: "1rem", borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
          <Typography
            id="epic-map-project-title"
            component="h2"
            sx={{
              flexGrow: 1,
              minWidth: 0,
              fontSize: "1.125rem",
              fontWeight: theme.typography.fontWeightBold,
              lineHeight: 1.3,
            }}
          >
            {name ?? <Skeleton width="70%" />}
          </Typography>
          <IconButton
            size="small"
            onClick={onClose}
            aria-label="Close project"
            sx={{ padding: "0.25rem", color: theme.palette.text.primary }}
          >
            <CloseIcon sx={{ fontSize: "1.25rem" }} />
          </IconButton>
        </Box>

        {isLoading ? (
          <>
            <Skeleton width="50%" />
            <Skeleton variant="rounded" height="1.5rem" sx={{ my: "0.5rem" }} />
            <Skeleton />
            <Skeleton />
          </>
        ) : notOpen ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: "0.5rem" }}>
            This project is no longer open in EPIC.Track.
          </Typography>
        ) : error || !project ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: "0.5rem" }}>
            This project could not be loaded. Please try again.
          </Typography>
        ) : (
          <>
            {project.proponentName && (
              <Typography variant="body2" color="text.secondary">
                {project.proponentName}
              </Typography>
            )}
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
                marginTop: "0.75rem",
              }}
            >
              {typeName && (
                <Chip
                  icon={<TypeIcon aria-hidden />}
                  label={typeName}
                  variant="outlined"
                  sx={{
                    ...chipSx,
                    backgroundColor: alpha(theme.palette.primary.main, 0.12),
                    color: theme.palette.text.primary,
                    borderColor: theme.palette.text.primary,
                  }}
                />
              )}
              {project.regionName && (
                <Chip
                  icon={<PlaceOutlinedIcon aria-hidden />}
                  label={project.regionName}
                  variant="outlined"
                  sx={chipSx}
                />
              )}
              {project.eaCertificate && (
                <Chip
                  label={`Certificate # ${project.eaCertificate}`}
                  variant="outlined"
                  sx={{
                    ...chipSx,
                    color: CERTIFICATE_COLOR,
                    borderColor: CERTIFICATE_COLOR,
                  }}
                />
              )}
            </Box>
            {project.description && (
              <>
                <Typography
                  variant="body2"
                  sx={{
                    marginTop: "0.75rem",
                    lineHeight: 1.5,
                    ...(expanded
                      ? {}
                      : {
                          display: "-webkit-box",
                          WebkitLineClamp: DESCRIPTION_LINES,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }),
                  }}
                >
                  {project.description}
                </Typography>
                <Button
                  size="small"
                  onClick={() => setExpanded((open) => !open)}
                  sx={{ padding: 0, minWidth: 0, textTransform: "none" }}
                >
                  {expanded ? "Read Less" : "Read More"}
                </Button>
              </>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
