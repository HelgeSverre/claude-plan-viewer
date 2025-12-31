// HMR support
if (import.meta.hot) {
  import.meta.hot.accept();
}

// Prism.js is loaded from CDN
declare const Prism: {
  highlight: (code: string, grammar: unknown, language: string) => string;
  languages: Record<string, unknown>;
};

interface Plan {
  filename: string;
  filepath: string;
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
let showDetailOverlay = false;
let selectedProjects: Set<string> = new Set();
const scrollPositions = new Map<string, number>();

const app = document.getElementById("app")!;

function setDetailOverlayOpen(open: boolean): void {
  showDetailOverlay = open;
  const overlay = document.getElementById("detail-overlay");
  if (!overlay) return;
  overlay.classList.toggle("is-open", open);
  overlay.setAttribute("aria-hidden", open ? "false" : "true");
}

function selectPlan(plan: Plan | null): void {
  // Save scroll position of current plan
  if (selectedPlan) {
    const detailContent = document.querySelector(".detail-content");
    if (detailContent) {
      scrollPositions.set(selectedPlan.filename, detailContent.scrollTop);
    }
  }

  selectedPlan = plan;
  showDetailOverlay = false;

  // Update URL
  if (plan) {
    const url = new URL(window.location.href);
    url.searchParams.set("plan", plan.filename);
    history.pushState(null, "", url.toString());
  } else {
    const url = new URL(window.location.href);
    url.searchParams.delete("plan");
    history.pushState(null, "", url.toString());
  }

  render();

  // Restore scroll position
  if (plan) {
    const savedScroll = scrollPositions.get(plan.filename);
    if (savedScroll !== undefined) {
      requestAnimationFrame(() => {
        const detailContent = document.querySelector(".detail-content");
        if (detailContent) {
          detailContent.scrollTop = savedScroll;
        }
      });
    }
  }
}

async function openInEditor(): Promise<void> {
  if (!selectedPlan) return;
  try {
    await fetch("/api/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filepath: selectedPlan.filepath }),
    });
  } catch (err) {
    console.error("Failed to open in editor:", err);
  }
}

function highlightText(text: string, query: string): string {
  if (!query) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return escaped.replace(regex, '<mark>$1</mark>');
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function debounce<Args extends unknown[]>(fn: (...args: Args) => void, ms: number): (...args: Args) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Args) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
}

function updateSearchQueryParam(query: string): void {
  const url = new URL(window.location.href);
  if (query) {
    url.searchParams.set("q", query);
  } else {
    url.searchParams.delete("q");
  }
  history.replaceState(null, "", url.toString());
}

const debouncedUpdateSearchQueryParam = debounce(updateSearchQueryParam, 500);

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
      case "created":
        cmp = new Date(a.created).getTime() - new Date(b.created).getTime();
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });
}

function renderMarkdown(content: string): string {
  let html = escapeHtml(content);

  // Code blocks (with language hint and Prism highlighting)
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_, lang, code) => {
      const language = lang || 'plaintext';
      const grammar = Prism.languages[language] || Prism.languages.plaintext;
      try {
        const highlighted = grammar
          ? Prism.highlight(code, grammar, language)
          : code;
        return `<pre class="language-${language}"><code class="language-${language}">${highlighted}</code></pre>`;
      } catch {
        return `<pre class="language-${language}"><code class="language-${language}">${code}</code></pre>`;
      }
    }
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

function applyFilters(): void {
  const query = searchQuery.toLowerCase();
  filteredPlans = plans.filter((p) => {
    // Apply project filter (empty set = show all)
    if (selectedProjects.size > 0 && (!p.project || !selectedProjects.has(p.project))) {
      return false;
    }
    // Apply search filter
    if (query) {
      return (
        p.title.toLowerCase().includes(query) ||
        p.content.toLowerCase().includes(query) ||
        p.filename.toLowerCase().includes(query) ||
        (p.project && p.project.toLowerCase().includes(query))
      );
    }
    return true;
  });
  sortPlans();
  render();
}

function getProjectTriggerText(projects: string[]): string {
  if (selectedProjects.size === 0) {
    return "All projects";
  }
  const selected = projects.filter(p => selectedProjects.has(p));
  const first = selected[0];
  if (!first) return "All projects";
  if (selected.length === 1) {
    return first;
  }
  return `${first} <span class="badge">+${selected.length - 1}</span>`;
}

function updateTableAndStats(): void {
  const totalSize = filteredPlans.reduce((sum, p) => sum + p.size, 0);

  // Update stats
  const statsEl = document.querySelector(".stats");
  if (statsEl) {
    statsEl.innerHTML = `
      <span>${filteredPlans.length}/${plans.length}</span>
      <span class="divider">|</span>
      <span>${formatSize(totalSize)}</span>
    `;
  }

  // Update trigger text and style
  const projects = [...new Set(plans.map(p => p.project).filter(Boolean))] as string[];
  const trigger = document.getElementById("project-trigger");
  if (trigger) {
    trigger.classList.toggle("has-selection", selectedProjects.size > 0);
    const chevronHtml = `<svg class="chevron" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>`;
    trigger.innerHTML = getProjectTriggerText(projects) + chevronHtml;
  }

  // Update table
  const tbody = document.getElementById("plans-table");
  if (tbody) {
    tbody.innerHTML = filteredPlans.map((plan) => `
      <tr data-filename="${plan.filename}" class="${selectedPlan?.filename === plan.filename ? "selected" : ""}">
         <td class="title-cell"><button class="title-btn" data-filename="${plan.filename}" title="${escapeHtml(plan.title)}">${highlightText(plan.title, searchQuery)}</button></td>
        <td class="filename-cell">${highlightText(plan.filename, searchQuery)}</td>
        <td class="project-cell">${plan.project ? highlightText(plan.project, searchQuery) : "—"}</td>
        <td class="num-cell">${formatSize(plan.size)}</td>
        <td class="num-cell">${plan.lineCount}</td>
        <td class="meta-cell">${formatDate(plan.modified)}</td>
        <td class="meta-cell">${formatDate(plan.created)}</td>
      </tr>
    `).join("");
  }
}

function render(): void {
  const totalSize = filteredPlans.reduce((sum, p) => sum + p.size, 0);

  // Get unique projects for filter chips
  const projects = [...new Set(plans.map(p => p.project).filter(Boolean))] as string[];
  projects.sort();

  app.innerHTML = `
    <div class="container">
      <div class="list-panel">
        <div class="header">
          <div class="header-row">
            <h1>
              <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              Claude Plan Viewer
            </h1>
            <div class="header-spacer"></div>
            <select class="sort-select" id="sort">
              <option value="modified-desc" ${sortKey === "modified" && sortDir === "desc" ? "selected" : ""}>Modified (newest)</option>
              <option value="modified-asc" ${sortKey === "modified" && sortDir === "asc" ? "selected" : ""}>Modified (oldest)</option>
              <option value="project-asc" ${sortKey === "project" && sortDir === "asc" ? "selected" : ""}>Project (A-Z)</option>
              <option value="project-desc" ${sortKey === "project" && sortDir === "desc" ? "selected" : ""}>Project (Z-A)</option>
              <option value="title-asc" ${sortKey === "title" && sortDir === "asc" ? "selected" : ""}>Title (A-Z)</option>
              <option value="title-desc" ${sortKey === "title" && sortDir === "desc" ? "selected" : ""}>Title (Z-A)</option>
              <option value="size-desc" ${sortKey === "size" && sortDir === "desc" ? "selected" : ""}>Size (largest)</option>
              <option value="size-asc" ${sortKey === "size" && sortDir === "asc" ? "selected" : ""}>Size (smallest)</option>
              <option value="lines-desc" ${sortKey === "lines" && sortDir === "desc" ? "selected" : ""}>Lines (most)</option>
              <option value="lines-asc" ${sortKey === "lines" && sortDir === "asc" ? "selected" : ""}>Lines (least)</option>
              <option value="created-desc" ${sortKey === "created" && sortDir === "desc" ? "selected" : ""}>Created (newest)</option>
              <option value="created-asc" ${sortKey === "created" && sortDir === "asc" ? "selected" : ""}>Created (oldest)</option>
            </select>
            <div class="search-wrapper">
              <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="search" class="search-input" id="search" placeholder="Search..." value="${escapeHtml(searchQuery)}" autofocus>
              <span class="search-kbd">⌘K</span>
            </div>
            ${projects.length > 0 ? `
            <div class="project-dropdown">
              <button class="dropdown-trigger ${selectedProjects.size > 0 ? 'has-selection' : ''}" id="project-trigger" popovertarget="project-menu">
                ${getProjectTriggerText(projects)}
                <svg class="chevron" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div id="project-menu" popover class="dropdown-menu">
                ${projects.map(p => `
                  <label class="dropdown-item">
                    <input type="checkbox" value="${escapeHtml(p)}" ${selectedProjects.has(p) ? 'checked' : ''}>
                    <span>${escapeHtml(p)}</span>
                  </label>
                `).join('')}
                ${selectedProjects.size > 0 ? `
                  <button class="dropdown-clear" id="clear-projects">Clear all</button>
                ` : ''}
              </div>
            </div>
            ` : ''}
            <button class="action-btn" id="refresh-btn" title="Refresh plans">
              <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th data-sort="title" class="${sortKey === "title" ? "sorted " + sortDir : ""}">
                  Title <span class="sort-icon">▲</span>
                </th>
                <th class="no-sort">Filename</th>
                <th data-sort="project" class="${sortKey === "project" ? "sorted " + sortDir : ""}">
                  Project <span class="sort-icon">▲</span>
                </th>
                <th data-sort="size" class="num-col ${sortKey === "size" ? "sorted " + sortDir : ""}">
                  Size <span class="sort-icon">▲</span>
                </th>
                <th data-sort="lines" class="num-col ${sortKey === "lines" ? "sorted " + sortDir : ""}">
                  Lines <span class="sort-icon">▲</span>
                </th>
                <th data-sort="modified" class="${sortKey === "modified" ? "sorted " + sortDir : ""}">
                  Modified <span class="sort-icon">▲</span>
                </th>
                <th data-sort="created" class="${sortKey === "created" ? "sorted " + sortDir : ""}">
                  Created <span class="sort-icon">▲</span>
                </th>
              </tr>
            </thead>
            <tbody id="plans-table">
              ${filteredPlans
                .map(
                  (plan) => `
                <tr data-filename="${plan.filename}" class="${selectedPlan?.filename === plan.filename ? "selected" : ""}">
                  <td class="title-cell"><button class="title-btn" data-filename="${plan.filename}">${highlightText(plan.title, searchQuery)}</button></td>
                  <td class="filename-cell">${highlightText(plan.filename, searchQuery)}</td>
                  <td class="project-cell">${plan.project ? highlightText(plan.project, searchQuery) : "—"}</td>
                  <td class="num-cell">${formatSize(plan.size)}</td>
                  <td class="num-cell">${plan.lineCount}</td>
                  <td class="meta-cell">${formatDate(plan.modified)}</td>
                  <td class="meta-cell">${formatDate(plan.created)}</td>
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
              <div class="detail-actions">
                <button class="action-btn" id="copy-btn" title="Copy markdown">
                  <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                <button class="action-btn" id="copy-path-btn" title="Copy file path">
                  <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </button>
                <button class="action-btn" id="overlay-btn" title="Show fullscreen">
                  <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
                  </svg>
                </button>
                <button class="action-btn" id="open-editor-btn" title="Open in editor">
                  <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              </div>
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
          <div class="shortcut-row"><kbd>Enter</kbd> <span>Open in editor</span></div>
          <div class="shortcut-row"><kbd>⌘</kbd> <kbd>K</kbd> <span>Focus search</span></div>
          <div class="shortcut-row"><kbd>Esc</kbd> <span>Blur search / Close modal</span></div>
          <div class="shortcut-row"><kbd>?</kbd> <span>Toggle this help</span></div>
        </div>
      </div>
    </div>
    ` : ''}
    ${selectedPlan ? `
    <div class="detail-overlay${showDetailOverlay ? " is-open" : ""}" id="detail-overlay" aria-hidden="${showDetailOverlay ? "false" : "true"}">
      <div class="detail-overlay-panel">
        <div class="detail-overlay-header">
          <div class="detail-overlay-title">${escapeHtml(selectedPlan.title)}</div>
          <button class="modal-close" id="close-overlay" title="Close fullscreen">&times;</button>
        </div>
        <div class="detail-meta detail-overlay-meta">
          ${selectedPlan.project ? `<span class="project-tag">${selectedPlan.project}</span>` : ""}
          <span>${selectedPlan.filename}</span>
          <span>${formatFullDate(selectedPlan.modified)}</span>
          <span>${formatSize(selectedPlan.size)}</span>
          <span>${selectedPlan.lineCount} lines</span>
        </div>
        <div class="detail-overlay-content">
          <div class="markdown">${renderMarkdown(selectedPlan.content)}</div>
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
    applyFilters();
    debouncedUpdateSearchQueryParam(searchQuery);
    // Restore focus and cursor position after render
    const newInput = document.getElementById("search") as HTMLInputElement;
    newInput?.focus();
    newInput?.setSelectionRange(searchQuery.length, searchQuery.length);
  });

  // Project dropdown handlers
  const projectMenu = document.getElementById("project-menu") as HTMLElement | null;
  projectMenu?.addEventListener("change", (e) => {
    const checkbox = e.target as HTMLInputElement;
    if (checkbox.type === "checkbox") {
      if (checkbox.checked) {
        selectedProjects.add(checkbox.value);
      } else {
        selectedProjects.delete(checkbox.value);
      }
      // Update filter without full re-render to keep popover open
      const query = searchQuery.toLowerCase();
      filteredPlans = plans.filter((p) => {
        if (selectedProjects.size > 0 && (!p.project || !selectedProjects.has(p.project))) {
          return false;
        }
        if (query) {
          return (
            p.title.toLowerCase().includes(query) ||
            p.content.toLowerCase().includes(query) ||
            p.filename.toLowerCase().includes(query) ||
            (p.project && p.project.toLowerCase().includes(query))
          );
        }
        return true;
      });
      sortPlans();
      // Update just the table and stats without closing popover
      updateTableAndStats();
    }
  });

  document.getElementById("clear-projects")?.addEventListener("click", () => {
    selectedProjects.clear();
    projectMenu?.hidePopover();
    applyFilters();
  });

  sortSelect?.addEventListener("change", (e) => {
    const parts = (e.target as HTMLSelectElement).value.split("-");
    const key = parts[0] ?? "modified";
    const dir = parts[1] ?? "desc";
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
        selectPlan(plan);
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

  // Copy markdown button handler
  document.getElementById("copy-btn")?.addEventListener("click", async () => {
    if (!selectedPlan) return;
    try {
      await navigator.clipboard.writeText(selectedPlan.content);
      showCopiedFeedback("copy-btn");
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  });

  // Copy path button handler
  document.getElementById("copy-path-btn")?.addEventListener("click", async () => {
    if (!selectedPlan) return;
    try {
      await navigator.clipboard.writeText(selectedPlan.filepath);
      showCopiedFeedback("copy-path-btn");
    } catch (err) {
      console.error("Failed to copy path:", err);
    }
  });

  // Open in editor button handler
  document.getElementById("open-editor-btn")?.addEventListener("click", async () => {
    if (!selectedPlan) return;
    try {
      await fetch("/api/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filepath: selectedPlan.filepath }),
      });
    } catch (err) {
      console.error("Failed to open in editor:", err);
    }
  });

  document.getElementById("overlay-btn")?.addEventListener("click", () => {
    setDetailOverlayOpen(true);
  });

  document.getElementById("close-overlay")?.addEventListener("click", () => {
    setDetailOverlayOpen(false);
  });

  const detailOverlay = document.getElementById("detail-overlay");
  detailOverlay?.addEventListener("click", (e) => {
    if (showDetailOverlay && e.target === detailOverlay) {
      setDetailOverlayOpen(false);
    }
  });

  // Title button click handler for keyboard accessibility
  document.querySelectorAll(".title-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const filename = (btn as HTMLButtonElement).dataset.filename;
      const plan = filteredPlans.find((p) => p.filename === filename);
      if (plan) {
        selectPlan(plan);
      }
    });
  });

  // Refresh button handler
  document.getElementById("refresh-btn")?.addEventListener("click", async () => {
    const btn = document.getElementById("refresh-btn");
    if (btn) btn.classList.add("loading");
    try {
      const resp = await fetch("/api/plans");
      plans = await resp.json();
      filteredPlans = [...plans];
      applyFilters();
    } catch (err) {
      console.error("Failed to refresh:", err);
    } finally {
      if (btn) btn.classList.remove("loading");
    }
  });
}

function showCopiedFeedback(btnId: string): void {
  const btn = document.getElementById(btnId);
  if (btn) {
    btn.classList.add("copied");
    const originalHtml = btn.innerHTML;
    btn.innerHTML = `
      <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
    `;
    setTimeout(() => {
      btn.classList.remove("copied");
      btn.innerHTML = originalHtml;
    }, 1500);
  }
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
    const plan = filteredPlans[newIdx];
    if (plan) {
      selectPlan(plan);
      document
        .querySelector(`tr[data-filename="${plan.filename}"]`)
        ?.scrollIntoView({ block: "nearest" });
    }
  }

  // Enter to open in editor
  if (e.key === "Enter" && selectedPlan) {
    const activeEl = document.activeElement;
    if (activeEl?.tagName !== "INPUT" && activeEl?.tagName !== "TEXTAREA" && activeEl?.tagName !== "BUTTON") {
      e.preventDefault();
      openInEditor();
    }
  }

  if (e.key === "Escape") {
    if (showDetailOverlay) {
      setDetailOverlayOpen(false);
    } else if (showHelpModal) {
      showHelpModal = false;
      render();
    } else {
      const searchInput = document.getElementById("search") as HTMLInputElement;
      if (document.activeElement === searchInput) {
        if (searchQuery) {
          // Clear search first
          searchQuery = "";
          searchInput.value = "";
          updateSearchQueryParam("");
          applyFilters();
        } else {
          // Already empty, blur
          searchInput.blur();
        }
      }
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

  if (e.key === "f" && selectedPlan && !e.metaKey && !e.ctrlKey && !e.altKey) {
    const activeEl = document.activeElement;
    if (activeEl?.tagName !== "INPUT" && activeEl?.tagName !== "TEXTAREA") {
      e.preventDefault();
      setDetailOverlayOpen(!showDetailOverlay);
    }
  }
});

// Handle browser back/forward
window.addEventListener("popstate", () => {
  const url = new URL(window.location.href);
  const planFilename = url.searchParams.get("plan");
  if (planFilename) {
    const plan = plans.find((p) => p.filename === planFilename);
    if (plan && plan !== selectedPlan) {
      selectedPlan = plan;
      render();
    }
  } else if (selectedPlan) {
    selectedPlan = null;
    render();
  }
});

// Initial load
async function init(): Promise<void> {
  app.innerHTML = '<div class="loading">Loading plans...</div>';

  try {
    const res = await fetch("/api/plans");
    plans = await res.json();
    filteredPlans = [...plans];

    // Check URL for initial state
    const url = new URL(window.location.href);

    // Load search query from URL
    const queryParam = url.searchParams.get("q");
    if (queryParam) {
      searchQuery = queryParam;
    }

    // Load plan selection from URL
    const planFilename = url.searchParams.get("plan");
    if (planFilename) {
      const plan = plans.find((p) => p.filename === planFilename);
      if (plan) {
        selectedPlan = plan;
      }
    }

    // Apply filters if search query was loaded
    if (searchQuery) {
      applyFilters();
    } else {
      render();
    }
  } catch (err) {
    app.innerHTML = `<div class="empty-state"><p>Failed to load plans</p><p class="hint">${err}</p></div>`;
  }
}

init();
