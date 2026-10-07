import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import { linkifyWikilinks, MEMORY_LINK_SCHEME } from "../utils/markdown.ts";

interface MarkdownProps {
  content: string;
  // Enables [[wikilinks]] and relative .md links, routed in-app instead of
  // navigating. Targets are wikilink names or filenames.
  onInternalLink?: (target: string) => void;
  isInternalLinkResolved?: (target: string) => boolean;
}

function internalTarget(href: string | undefined): string | null {
  if (!href) return null;
  if (href.startsWith(MEMORY_LINK_SCHEME)) {
    return decodeURIComponent(href.slice(MEMORY_LINK_SCHEME.length));
  }
  const isUrl = /^[a-z][a-z0-9+.-]*:/i.test(href);
  if (isUrl || href.startsWith("#") || href.startsWith("/")) return null;
  const path = (href.split("#")[0] ?? "").replace(/^\.\//, "");
  return path.toLowerCase().endsWith(".md") ? decodeURIComponent(path) : null;
}

export function Markdown({
  content,
  onInternalLink,
  isInternalLinkResolved,
}: MarkdownProps) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(url) =>
          url.startsWith(MEMORY_LINK_SCHEME) ? url : defaultUrlTransform(url)
        }
        components={{
          a({ node, href, children, ...props }) {
            const target = onInternalLink ? internalTarget(href) : null;
            if (onInternalLink && target !== null) {
              const resolved = isInternalLinkResolved?.(target) ?? true;
              return (
                <a
                  href="#"
                  className={resolved ? "memory-link" : "memory-link broken"}
                  title={resolved ? undefined : `${target} doesn't exist`}
                  onClick={(e) => {
                    e.preventDefault();
                    if (resolved) onInternalLink(target);
                  }}
                >
                  {children}
                </a>
              );
            }
            return (
              <a href={href} target="_blank" rel="noreferrer" {...props}>
                {children}
              </a>
            );
          },
          // `node` is the hast node react-markdown passes; keep it off the DOM.
          // react-markdown v9+ has no `inline` prop: fenced blocks with a
          // language get a language-* class, inline code never does.
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            return match ? (
              <SyntaxHighlighter
                style={atomDark}
                language={match[1]}
                PreTag="div"
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          table({ node, children, ...props }) {
            return (
              <div className="markdown-table-wrapper">
                <table {...props}>{children}</table>
              </div>
            );
          },
        }}
      >
        {onInternalLink ? linkifyWikilinks(content) : content}
      </ReactMarkdown>
    </div>
  );
}
