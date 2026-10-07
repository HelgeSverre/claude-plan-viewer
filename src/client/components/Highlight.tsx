import { escapeRegex } from "../utils/strings.ts";

interface HighlightProps {
  text: string;
  query: string;
}

// Wraps case-insensitive matches of `query` in <mark>, rendered as React
// nodes so text containing markup (e.g. "<Button>") is never parsed as HTML
export function Highlight({ text, query }: HighlightProps) {
  if (!query) return <>{text}</>;

  // A capture group makes split() keep the matches at odd indices
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <mark key={i}>{part}</mark> : part,
      )}
    </>
  );
}
