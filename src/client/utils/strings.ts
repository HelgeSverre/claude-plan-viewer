export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// "1 memory", "4 memories", "2 plans"
export function pluralize(count: number, word: string): string {
  const plural = word.endsWith("y") ? `${word.slice(0, -1)}ies` : `${word}s`;
  return `${count} ${count === 1 ? word : plural}`;
}

// Shorten /Users/name/... and /home/name/... to ~/...
export function abbreviateHome(path: string): string {
  return path.replace(/^\/(?:Users|home)\/[^/]+(?=\/|$)/, "~");
}
