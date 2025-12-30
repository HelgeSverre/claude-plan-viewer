interface Plan {
  filename: string;
  title: string;
  content: string;
  size: number;
  modified: string;
  created: string;
  lineCount: number;
  wordCount: number;
  project: string | null;
}

let plans: Plan[] = [];
let filteredPlans: Plan[] = [];
let selectedPlan: Plan | null = null;
let sortKey = "modified";
let sortDir: "asc" | "desc" = "desc";
let searchQuery = "";
let showHelpModal = false;

const app = document.getElementById("app")!;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  if (diff < 60000) return "just now";
  if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
  if (diff < 604800000) return Math.floor(diff / 86400000) + "d ago";

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  return (bytes / 1024).toFixed(1) + " KB";
}

function sortPlans(): void {
  filteredPlans.sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "title":
        cmp = a.title.localeCompare(b.title);
        break;
      case "project":
        cmp = (a.project || "zzz").localeCompare(b.project || "zzz");
        break;
      case "modified":
        cmp = new Date(a.modified).getTime() - new Date(b.modified).getTime();
        break;
      case "size":
        cmp = a.size - b.size;
        break;
      case "lines":
        cmp = a.lineCount - b.lineCount;
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });
}

function renderMarkdown(content: string): string {
  let html = escapeHtml(content);

  // Code blocks (with language hint)
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    '<pre><code class="language-$1">$2</code></pre>'
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
    }
  );

  // Checkbox lists
  html = html.replace(/^- \[x\] (.+)$/gm, '<li><input type="checkbox" checked disabled> $1</li>');
  html = html.replace(/^- \[ \] (.+)$/gm, '<li><input type="checkbox" disabled> $1</li>');

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

function render(): void {
  const totalSize = filteredPlans.reduce((sum, p) => sum + p.size, 0);

  app.innerHTML = `
    <div class="container">
      <div class="list-panel">
        <div class="header">
          <div class="header-top">
            <h1>
              <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Claude Plans
            </h1>
            <span class="kbd">Cmd+K</span>
          </div>
          <div class="search-bar">
            <div class="search-wrapper">
              <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" class="search-input" id="search" placeholder="Search plans..." value="${escapeHtml(searchQuery)}" autofocus>
            </div>
            <select class="sort-select" id="sort">
              <option value="modified-desc" ${sortKey === "modified" && sortDir === "desc" ? "selected" : ""}>Modified (newest)</option>
              <option value="modified-asc" ${sortKey === "modified" && sortDir === "asc" ? "selected" : ""}>Modified (oldest)</option>
              <option value="project-asc" ${sortKey === "project" && sortDir === "asc" ? "selected" : ""}>Project (A-Z)</option>
              <option value="project-desc" ${sortKey === "project" && sortDir === "desc" ? "selected" : ""}>Project (Z-A)</option>
              <option value="title-asc" ${sortKey === "title" && sortDir === "asc" ? "selected" : ""}>Title (A-Z)</option>
              <option value="title-desc" ${sortKey === "title" && sortDir === "desc" ? "selected" : ""}>Title (Z-A)</option>
              <option value="size-desc" ${sortKey === "size" && sortDir === "desc" ? "selected" : ""}>Size (largest)</option>
              <option value="size-asc" ${sortKey === "size" && sortDir === "asc" ? "selected" : ""}>Size (smallest)</option>
            </select>
          </div>
          <div class="stats">
            <span>${filteredPlans.length} of ${plans.length} plans</span>
            <span class="divider">|</span>
            <span>${formatSize(totalSize)}</span>
          </div>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th data-sort="title" class="${sortKey === "title" ? "sorted " + sortDir : ""}">
                  Title <span class="sort-icon">▲</span>
                </th>
                <th data-sort="project" class="${sortKey === "project" ? "sorted " + sortDir : ""}">
                  Project <span class="sort-icon">▲</span>
                </th>
                <th data-sort="modified" class="${sortKey === "modified" ? "sorted " + sortDir : ""}">
                  Modified <span class="sort-icon">▲</span>
                </th>
                <th data-sort="size" class="${sortKey === "size" ? "sorted " + sortDir : ""}">
                  Size <span class="sort-icon">▲</span>
                </th>
              </tr>
            </thead>
            <tbody id="plans-table">
              ${filteredPlans
                .map(
                  (plan) => `
                <tr data-filename="${plan.filename}" class="${selectedPlan?.filename === plan.filename ? "selected" : ""}">
                  <td class="title-cell">${escapeHtml(plan.title)}</td>
                  <td class="project-cell">${plan.project || "—"}</td>
                  <td class="meta-cell">${formatDate(plan.modified)}</td>
                  <td class="meta-cell">${formatSize(plan.size)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
      <div class="detail-panel">
        ${
          selectedPlan
            ? `
          <div class="detail-header">
            <div class="detail-header-top">
              <div class="detail-title">${escapeHtml(selectedPlan.title)}</div>
              <button class="copy-btn" id="copy-btn" title="Copy markdown">
                <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            <div class="detail-meta">
              ${selectedPlan.project ? `<span class="project-tag">${selectedPlan.project}</span>` : ""}
              <span>${selectedPlan.filename}</span>
              <span>${formatFullDate(selectedPlan.modified)}</span>
              <span>${formatSize(selectedPlan.size)}</span>
              <span>${selectedPlan.lineCount} lines</span>
            </div>
          </div>
          <div class="detail-content">
            <div class="markdown">${renderMarkdown(selectedPlan.content)}</div>
          </div>
        `
            : `
          <div class="empty-state">
            <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>Select a plan to view details</p>
            <p class="hint">Use ↑↓ arrows to navigate</p>
          </div>
        `
        }
      </div>
    </div>
    ${showHelpModal ? `
    <div class="modal-backdrop" id="help-modal">
      <div class="modal">
        <div class="modal-header">
          <h2>Keyboard Shortcuts</h2>
          <button class="modal-close" id="close-help">&times;</button>
        </div>
        <div class="modal-body">
          <div class="shortcut-row"><kbd>↑</kbd> <kbd>↓</kbd> <span>Navigate plans</span></div>
          <div class="shortcut-row"><kbd>⌘</kbd> <kbd>K</kbd> <span>Focus search</span></div>
          <div class="shortcut-row"><kbd>Esc</kbd> <span>Blur search / Close modal</span></div>
          <div class="shortcut-row"><kbd>?</kbd> <span>Toggle this help</span></div>
        </div>
      </div>
    </div>
    ` : ''}
  `;

  attachEventListeners();
}

function attachEventListeners(): void {
  const searchInput = document.getElementById("search") as HTMLInputElement;
  const sortSelect = document.getElementById("sort") as HTMLSelectElement;
  const tbody = document.getElementById("plans-table")!;
  const ths = document.querySelectorAll("th[data-sort]");

  searchInput?.addEventListener("input", (e) => {
    searchQuery = (e.target as HTMLInputElement).value;
    const query = searchQuery.toLowerCase();
    filteredPlans = plans.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.content.toLowerCase().includes(query) ||
        p.filename.toLowerCase().includes(query) ||
        (p.project && p.project.toLowerCase().includes(query))
    );
    sortPlans();
    render();
    // Restore focus and cursor position after render
    const newInput = document.getElementById("search") as HTMLInputElement;
    newInput?.focus();
    newInput?.setSelectionRange(searchQuery.length, searchQuery.length);
  });

  sortSelect?.addEventListener("change", (e) => {
    const [key, dir] = (e.target as HTMLSelectElement).value.split("-");
    sortKey = key;
    sortDir = dir as "asc" | "desc";
    sortPlans();
    render();
  });

  ths.forEach((th) => {
    th.addEventListener("click", () => {
      const key = (th as HTMLElement).dataset.sort!;
      if (sortKey === key) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
      } else {
        sortKey = key;
        sortDir = key === "title" ? "asc" : "desc";
      }
      sortPlans();
      render();
    });
  });

  tbody?.addEventListener("click", (e) => {
    const row = (e.target as HTMLElement).closest("tr");
    if (row) {
      const filename = (row as HTMLElement).dataset.filename;
      const plan = filteredPlans.find((p) => p.filename === filename);
      if (plan) {
        selectedPlan = plan;
        render();
      }
    }
  });

  // Help modal close handlers
  document.getElementById("close-help")?.addEventListener("click", () => {
    showHelpModal = false;
    render();
  });
  document.getElementById("help-modal")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      showHelpModal = false;
      render();
    }
  });

  // Copy button handler
  document.getElementById("copy-btn")?.addEventListener("click", async () => {
    if (!selectedPlan) return;
    try {
      await navigator.clipboard.writeText(selectedPlan.content);
      const btn = document.getElementById("copy-btn");
      if (btn) {
        btn.classList.add("copied");
        btn.innerHTML = `
          <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        `;
        setTimeout(() => {
          btn.classList.remove("copied");
          btn.innerHTML = `
            <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          `;
        }, 1500);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  });
}

// Global keyboard navigation
document.addEventListener("keydown", (e) => {
  if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    const search = document.getElementById("search") as HTMLInputElement;
    search?.focus();
    search?.select();
  }

  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    const idx = filteredPlans.findIndex(
      (p) => p.filename === selectedPlan?.filename
    );
    let newIdx = e.key === "ArrowDown" ? idx + 1 : idx - 1;
    if (newIdx < 0) newIdx = 0;
    if (newIdx >= filteredPlans.length) newIdx = filteredPlans.length - 1;
    if (filteredPlans[newIdx]) {
      selectedPlan = filteredPlans[newIdx];
      render();
      document
        .querySelector(`tr[data-filename="${filteredPlans[newIdx].filename}"]`)
        ?.scrollIntoView({ block: "nearest" });
    }
  }

  if (e.key === "Escape") {
    if (showHelpModal) {
      showHelpModal = false;
      render();
    } else {
      (document.getElementById("search") as HTMLInputElement)?.blur();
    }
  }

  // Toggle help modal with ?
  if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
    const activeEl = document.activeElement;
    if (activeEl?.tagName !== "INPUT" && activeEl?.tagName !== "TEXTAREA") {
      e.preventDefault();
      showHelpModal = !showHelpModal;
      render();
    }
  }
});

// Initial load
async function init(): Promise<void> {
  app.innerHTML = '<div class="loading">Loading plans...</div>';

  try {
    const res = await fetch("/api/plans");
    plans = await res.json();
    filteredPlans = [...plans];
    render();
  } catch (err) {
    app.innerHTML = `<div class="empty-state"><p>Failed to load plans</p><p class="hint">${err}</p></div>`;
  }
}

init();
