import { renderMarkdown } from "../utils/markdown.ts";

interface MarkdownProps {
  content: string;
}

export function Markdown({ content }: MarkdownProps) {
  const html = renderMarkdown(content);

  return (
    <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />
  );
}
