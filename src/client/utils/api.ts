import type { Plan, PlanMetadata } from "../types.ts";

export async function fetchPlans(signal?: AbortSignal): Promise<PlanMetadata[]> {
  const url = new URL("/api/plans", window.location.origin);
  const res = await fetch(url.toString(), { signal });
  if (!res.ok) {
    throw new Error(`Failed to fetch plans: ${res.statusText}`);
  }
  const data = await res.json();
  return data.plans;
}

export async function fetchProjects(): Promise<string[]> {
  const res = await fetch("/api/projects");
  const data = await res.json();
  return data.projects;
}

export async function fetchPlanContent(filename: string): Promise<string> {
  const res = await fetch(`/api/plans/${encodeURIComponent(filename)}/content`);
  if (!res.ok) {
    throw new Error(`Failed to fetch plan content: ${res.statusText}`);
  }
  const data = await res.json();
  return data.content;
}

export async function openInEditor(filepath: string): Promise<void> {
  await fetch("/api/open", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filepath }),
  });
}

export async function refreshCache(): Promise<void> {
  await fetch("/api/refresh", { method: "POST" });
}