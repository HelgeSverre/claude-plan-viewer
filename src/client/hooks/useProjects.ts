import useSWR from "swr";

interface UseProjectsReturn {
  projects: string[];
  loading: boolean;
}

const projectsFetcher = async (url: string): Promise<string[]> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch projects: ${res.statusText}`);
  }
  const data = await res.json();
  return data.projects;
};

export function useProjects(): UseProjectsReturn {
  const { data: projects = [], isLoading: loading } = useSWR<string[]>(
    "/api/projects",
    projectsFetcher,
    {
      onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
        // Don't retry on 4xx errors
        if (error.status >= 400 && error.status < 500) return;
        // Retry up to 5 times on network errors with exponential backoff
        if (retryCount >= 5) return;
        setTimeout(() => revalidate({ retryCount }), 500 * (retryCount + 1));
      },
      revalidateOnFocus: false,
    },
  );

  return { projects, loading };
}
