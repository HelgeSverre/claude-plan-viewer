import { useState, useEffect } from "react";
import { fetchProjects } from "../utils/api.ts";

interface UseProjectsReturn {
  projects: string[];
  loading: boolean;
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects()
      .then(setProjects)
      .catch((err) => console.error("Failed to load projects:", err))
      .finally(() => setLoading(false));
  }, []);

  return { projects, loading };
}
