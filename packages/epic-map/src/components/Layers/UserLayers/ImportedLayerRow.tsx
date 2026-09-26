import { Box, Typography } from "@mui/material";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import { useTheme } from "@mui/material/styles";
import type { ImportedLayer } from "@/api/useImportedLayers";

/**
 * One imported layer in My Layers: its name, whether it was flagged
 * sensitive, and its description. Always drawn - showing, hiding and the
 * layer's other controls come with the rest of My Layers.
 */
export default function ImportedLayerRow({ layer }: { layer: ImportedLayer }) {
  const theme = useTheme();

  return (
    <Box
      component="li"
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.5rem",
        padding: "0.375rem 1rem",
      }}
    >
      <LayersOutlinedIcon
        aria-hidden
        sx={{
          flexShrink: 0,
          marginTop: "0.125rem",
          fontSize: "1rem",
          color: theme.palette.text.secondary,
        }}
      />
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
          <Typography
            title={layer.name}
            sx={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: theme.typography.body2.fontSize,
              color: theme.palette.text.primary,
            }}
          >
            {layer.name}
          </Typography>
          {layer.isSensitive && (
            <Box
              component="span"
              sx={{
                flexShrink: 0,
                padding: "0 0.3125rem",
                borderRadius: `${theme.shape.borderRadius}px`,
                border: `1px solid ${theme.palette.warning.main}`,
                color: theme.palette.warning.dark,
                fontSize: "0.6875rem",
                fontWeight: theme.typography.fontWeightBold,
                lineHeight: 1.5,
              }}
            >
              Sensitive
            </Box>
          )}
        </Box>
        {layer.description && (
          <Typography
            title={layer.description}
            sx={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: theme.typography.caption.fontSize,
              lineHeight: 1.5,
              color: theme.palette.text.secondary,
            }}
          >
            {layer.description}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
