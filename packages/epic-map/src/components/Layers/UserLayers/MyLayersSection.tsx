import { useState } from "react";
import DashedEmptyState from "@/components/Layers/DashedEmptyState";
import LayersSection from "@/components/Layers/LayersSection";
import ImportFileDialog from "@/components/Layers/UserLayers/ImportFileDialog";
import ImportFileDropZone from "@/components/Layers/UserLayers/ImportFileDropZone";

/**
 * Layers the user imports themselves.
 */
export default function MyLayersSection() {
  const [expanded, setExpanded] = useState(true);
  /** The file being imported, which is what holds the dialog open. */
  const [importing, setImporting] = useState<File | null>(null);

  return (
    <LayersSection
      id="epic-map-layers-mine"
      title="My Layers"
      count={0}
      expanded={expanded}
      onToggle={() => setExpanded((isExpanded) => !isExpanded)}
      divider={false}
    >
      <DashedEmptyState>
        You do not have any imported layers yet.
      </DashedEmptyState>
      <ImportFileDropZone onFileAccepted={setImporting} />

      {importing && (
        <ImportFileDialog
          key={`${importing.name}:${importing.lastModified}`}
          file={importing}
          existingNames={[]}
          onClose={() => setImporting(null)}
          onUpload={() => setImporting(null)}
        />
      )}
    </LayersSection>
  );
}
