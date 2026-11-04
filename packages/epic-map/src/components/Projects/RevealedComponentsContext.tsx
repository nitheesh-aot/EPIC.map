import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** EAO features under one map click, top first. A new object per click. */
export interface MapPick {
  featureIds: readonly string[];
}

interface RevealedComponents {
  featureIds: readonly string[];
  setFeatureIds: (ids: readonly string[]) => void;
  hiddenFootprintIds: readonly string[];
  setHiddenFootprintIds: (ids: readonly string[]) => void;
  selectedFeatureIds: readonly string[];
  setSelectedFeatureIds: (ids: readonly string[]) => void;
  mapPick: MapPick | null;
  setMapPick: (pick: MapPick | null) => void;
}

/**
 * Shared between the project panel, which switches components on and off and
 * selects one, and the EAO layer, which draws them. A click on the map comes
 * back the other way, so the panel can select what was clicked.
 */
const RevealedComponentsContext = createContext<RevealedComponents>({
  featureIds: [],
  setFeatureIds: () => {},
  hiddenFootprintIds: [],
  setHiddenFootprintIds: () => {},
  selectedFeatureIds: [],
  setSelectedFeatureIds: () => {},
  mapPick: null,
  setMapPick: () => {},
});

export const RevealedComponentsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [featureIds, setFeatureIds] = useState<readonly string[]>([]);
  const [hiddenFootprintIds, setHiddenFootprintIds] = useState<
    readonly string[]
  >([]);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<
    readonly string[]
  >([]);
  const [mapPick, setMapPick] = useState<MapPick | null>(null);
  const value = useMemo(
    () => ({
      featureIds,
      setFeatureIds,
      hiddenFootprintIds,
      setHiddenFootprintIds,
      selectedFeatureIds,
      setSelectedFeatureIds,
      mapPick,
      setMapPick,
    }),
    [featureIds, hiddenFootprintIds, selectedFeatureIds, mapPick],
  );

  return (
    <RevealedComponentsContext.Provider value={value}>
      {children}
    </RevealedComponentsContext.Provider>
  );
};

export const useRevealedComponents = () =>
  useContext(RevealedComponentsContext);
