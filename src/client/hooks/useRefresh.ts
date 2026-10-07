import { useCallback, useState } from "react";
import { useSWRConfig } from "swr";
import { refreshCache } from "../utils/api.ts";

// Drop the server caches, then revalidate every SWR key (plans, memory,
// search results and content)
export function useRefresh(): {
  refresh: () => Promise<void>;
  refreshing: boolean;
} {
  const [refreshing, setRefreshing] = useState(false);
  const { mutate } = useSWRConfig();

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshCache();
      await mutate(() => true);
    } finally {
      setRefreshing(false);
    }
  }, [mutate]);

  return { refresh, refreshing };
}
