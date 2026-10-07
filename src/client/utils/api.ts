export async function fetchPlanContent(filename: string): Promise<string> {
  const res = await fetch(`/api/plans/${encodeURIComponent(filename)}/content`);
  if (!res.ok) {
    throw new Error(`Failed to fetch plan content: ${res.statusText}`);
  }
  const data = await res.json();
  return data.content;
}

// Filenames of plans whose content contains the query (server holds the content)
export async function searchPlanContent(q: string): Promise<string[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) {
    throw new Error(`Failed to search plans: ${res.statusText}`);
  }
  const data = await res.json();
  return data.filenames;
}

export async function openInEditor(filepath: string): Promise<void> {
  await fetch("/api/open", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filepath }),
  });
}

export interface RefreshResponse {
  success: boolean;
  before: number;
  after: number;
}

export async function refreshCache(): Promise<RefreshResponse> {
  const res = await fetch("/api/refresh", { method: "POST" });
  return res.json();
}

export async function fetchMemoryContent(id: string): Promise<string> {
  const res = await fetch(`/api/memory/content?id=${encodeURIComponent(id)}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch memory content: ${res.statusText}`);
  }
  const data = await res.json();
  return data.content;
}

// Ids of memory entries whose content contains the query
export async function searchMemoryContent(q: string): Promise<string[]> {
  const res = await fetch(`/api/memory/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) {
    throw new Error(`Failed to search memory: ${res.statusText}`);
  }
  const data = await res.json();
  return data.ids;
}
