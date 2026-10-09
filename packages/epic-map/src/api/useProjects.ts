import { useQuery } from "@tanstack/react-query";
import type { FeatureCollection, Point } from "geojson";
import { PROJECTS_REFRESH_MS } from "@/utils/config";
import { epicMapQueryKey } from "@/utils/queryKeys";
import { useMapWidget } from "@/widget/MapWidgetContext";

const PROJECTS_PATH = "/projects";

/** What a project's dot is drawn from. */
export interface ProjectPoint {
  id: number;
  name: string;
  typeName: string | null;
  hasWorksInProgress: boolean;
}

/** What the project card shows. */
export interface Project extends ProjectPoint {
  description: string | null;
  proponentName: string | null;
  regionName: string | null;
  eaCertificate: string | null;
  longitude: number;
  latitude: number;
}

export type ProjectFeatures = FeatureCollection<Point, ProjectPoint>;

/**
 * Every open EPIC.Track project, as map-api serves them. map-api caches Track
 * for the same period, so refetching sooner would only return the same list.
 */
export const useProjects = () => {
  const { api } = useMapWidget();

  return useQuery({
    queryKey: epicMapQueryKey("projects"),
    queryFn: async ({ signal }) =>
      (await api.get<ProjectFeatures>(PROJECTS_PATH, { signal })).data,
    staleTime: PROJECTS_REFRESH_MS,
    refetchInterval: PROJECTS_REFRESH_MS,
  });
};

export const useProject = (projectId: number | null) => {
  const { api } = useMapWidget();

  return useQuery({
    queryKey: epicMapQueryKey("projects", projectId),
    queryFn: async ({ signal }) =>
      (await api.get<Project>(`${PROJECTS_PATH}/${projectId}`, { signal })).data,
    enabled: projectId !== null,
    staleTime: PROJECTS_REFRESH_MS,
  });
};
