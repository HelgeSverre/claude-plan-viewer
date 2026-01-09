import { escapeHtml } from "./strings.ts";
import Prism from "./prism.ts";

export function renderMarkdown(content: string): string {
  // First, extract and process code blocks before escaping
  const codeBlocks: string[] = [];
  let processed = content.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_, lang, code) => {
      const language = lang || "plaintext";
      const grammar = Prism.languages[language] || Prism.languages.plaintext;
      let highlighted: string;
      try {
        highlighted = grammar
          ? Prism.highlight(code, grammar, language)
          : escapeHtml(code);
      } catch {
        highlighted = escapeHtml(code);
      }
      const block = `<pre class="language-${language}"><code class="language-${language}">${highlighted}</code></pre>`;
      codeBlocks.push(block);
      return `\x00CODE_BLOCK_${codeBlocks.length - 1}\x00`;
    },
  );

  // Now escape the rest
  let html = escapeHtml(processed);

  // Restore code blocks
  html = html.replace(
    /\x00CODE_BLOCK_(\d+)\x00/g,
    (_, idx) => codeBlocks[parseInt(idx)],
  );

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Headers
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold and italic
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, "<blockquote><p>$1</p></blockquote>");

  // Horizontal rules
  html = html.replace(/^---$/gm, "<hr>");

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Tables
  html = html.replace(
    /\|(.+)\|\n\|[-| ]+\|\n((?:\|.+\|\n?)+)/g,
    (_, header, body) => {
      const headers = header
        .split("|")
        .filter((c: string) => c.trim())
        .map((c: string) => `<th>${c.trim()}</th>`)
        .join("");
      const rows = body
        .trim()
        .split("\n")
        .map((row: string) => {
          const cells = row
            .split("|")
            .filter((c: string) => c.trim())
            .map((c: string) => `<td>${c.trim()}</td>`)
            .join("");
          return `<tr>${cells}</tr>`;
        })
        .join("");
      return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
    },
  );

  // Checkbox lists
  html = html.replace(
    /^- \[x\] (.+)$/gm,
    '<li><input type="checkbox" checked disabled> $1</li>',
  );
  html = html.replace(
    /^- \[ \] (.+)$/gm,
    '<li><input type="checkbox" disabled> $1</li>',
  );

  // Regular lists
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>");

  // Numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

  // Paragraphs - wrap remaining text blocks
  const blocks = html.split(/\n\n+/);
  html = blocks
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (
        trimmed.startsWith("<h") ||
        trimmed.startsWith("<ul") ||
        trimmed.startsWith("<ol") ||
        trimmed.startsWith("<pre") ||
        trimmed.startsWith("<hr") ||
        trimmed.startsWith("<blockquote") ||
        trimmed.startsWith("<table")
      ) {
        return trimmed;
      }
      return "<p>" + trimmed.replace(/\n/g, "<br>") + "</p>";
    })
    .join("\n");

  return html;
}
