// Internal links in rendered memory use this scheme: [[target]] becomes
// [target](memory:target) so the Markdown component can route it in-app.
export const MEMORY_LINK_SCHEME = "memory:";

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;

export function stripFrontmatter(content: string): string {
  return content.replace(FRONTMATTER, "");
}

// Rewrite [[target]], [[target|alias]] and [[target#heading]] as markdown
// links, leaving fenced and inline code untouched.
export function linkifyWikilinks(markdown: string): string {
  return markdown
    .split(/(^(?:```|~~~)[^\n]*\n[\s\S]*?^(?:```|~~~)[^\n]*$)/m)
    .map((chunk, i) =>
      i % 2 === 1
        ? chunk
        : chunk
            .split(/(`[^`\n]*`)/)
            .map((part, j) =>
              j % 2 === 1
                ? part
                : part.replace(
                    /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g,
                    (_, target: string, alias?: string) =>
                      `[${(alias ?? target).trim()}](${MEMORY_LINK_SCHEME}${encodeURIComponent(target.trim())})`,
                  ),
            )
            .join(""),
    )
    .join("");
}
