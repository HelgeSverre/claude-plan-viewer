<script setup lang="ts">
import { ref } from "vue";

const copiedStates = ref<Record<string, boolean>>({});
const activeTab = ref<string>("npx");
const mobileMenuOpen = ref(false);

const installMethods = [
    { id: "npx", label: "npx", command: "npx claude-plan-viewer", hint: "No installation required. Runs directly with Node.js 18+" },
    { id: "bun", label: "bun", command: "bunx claude-plan-viewer", hint: "Even faster with Bun runtime" },
    { id: "npm", label: "npm", command: "npm i -g claude-plan-viewer", hint: "Install globally, then run claude-plan-viewer" },
    { id: "binary", label: "Binary", command: null, hint: "Download standalone executable - no runtime needed", link: "https://github.com/HelgeSverre/claude-plan-viewer/releases" },
];

async function copyToClipboard(text: string, key: string) {
    try {
        await navigator.clipboard.writeText(text);
        copiedStates.value[key] = true;
        setTimeout(() => {
            copiedStates.value[key] = false;
        }, 2000);
    } catch (err) {
        console.error("Copy failed:", err);
    }
}
</script>

<template>
    <div class="custom-home">
        <header>
            <div class="container header-inner">
                <a href="/" class="logo">
                    <div class="logo-icon">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke-width="2"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                            />
                        </svg>
                    </div>
                    <span class="logo-text">Claude Plan Viewer</span>
                </a>
                <button
                    class="mobile-menu-btn"
                    :class="{ open: mobileMenuOpen }"
                    @click="mobileMenuOpen = !mobileMenuOpen"
                    aria-label="Toggle menu"
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
                <nav :class="{ open: mobileMenuOpen }">
                    <a href="#features" @click="mobileMenuOpen = false">Features</a>
                    <a href="#installation" @click="mobileMenuOpen = false">Installation</a>
                    <a href="/getting-started/quickstart" @click="mobileMenuOpen = false">Docs</a>
                    <a
                        href="https://github.com/HelgeSverre/claude-plan-viewer"
                        target="_blank"
                        rel="noopener"
                        @click="mobileMenuOpen = false"
                        >GitHub</a
                    >
                </nav>
            </div>
        </header>

        <main>
            <section class="hero">
                <div class="container">
                    <h1>
                        A friendly way to browse <br />your Claude Code plans
                    </h1>
                    <p>
                        Search, sort, and read your plans in a clean web
                        interface. No setup required.
                    </p>

                    <div class="install-card">
                        <code>npx claude-plan-viewer</code>
                        <button
                            class="copy-btn"
                            :class="{ copied: copiedStates['hero'] }"
                            @click="
                                copyToClipboard(
                                    'npx claude-plan-viewer',
                                    'hero',
                                )
                            "
                        >
                            <svg
                                v-if="!copiedStates['hero']"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
                                />
                            </svg>
                            <svg
                                v-else
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="m4.5 12.75 6 6 9-13.5"
                                />
                            </svg>
                            {{ copiedStates["hero"] ? "Copied!" : "Copy" }}
                        </button>
                    </div>

                    <div class="cta-group">
                        <a
                            href="https://github.com/HelgeSverre/claude-plan-viewer"
                            class="btn btn-primary"
                            target="_blank"
                            rel="noopener"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                                />
                            </svg>
                            View on GitHub
                        </a>
                        <a
                            href="https://npmjs.com/package/claude-plan-viewer"
                            class="btn btn-secondary btn-icon npm-btn"
                            target="_blank"
                            rel="noopener"
                            aria-label="npm package"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 576 512"
                                fill="currentColor"
                            >
                                <path
                                    d="M288 288h-32v-64h32v64zm288-128v192H288v32H160v-32H0V160h576zm-416 32H32v128h64v-96h32v96h32V192zm160 0H192v160h64v-32h64V192zm224 0H352v128h64v-96h32v96h32v-96h32v96h32V192z"
                                />
                            </svg>
                        </a>
                    </div>
                </div>
            </section>

            <section class="screenshot-section">
                <div class="container">
                    <div class="screenshot-card">
                        <div class="screenshot-header">
                            <div class="screenshot-dot"></div>
                            <div class="screenshot-dot"></div>
                            <div class="screenshot-dot"></div>
                        </div>
                        <img
                            src="/screenshot.png"
                            alt="Claude Plan Viewer interface showing a list of plans with search, sort, and detail view"
                            class="screenshot-img"
                        />
                    </div>
                </div>
            </section>

            <section class="features" id="features">
                <div class="container">
                    <h2>Everything you need</h2>
                    <div class="feature-grid">
                        <div class="feature-card">
                            <div class="feature-icon">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke-width="1.5"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                                    />
                                </svg>
                            </div>
                            <h3>Browse & Search</h3>
                            <p>
                                Full-text search across all your plans. Press
                                <span class="kbd">Cmd+K</span> to instantly
                                focus the search bar.
                            </p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke-width="1.5"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5"
                                    />
                                </svg>
                            </div>
                            <h3>Sort Options</h3>
                            <p>
                                Sort plans by title, project name, date
                                modified, or file size to find what you need.
                            </p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke-width="1.5"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
                                    />
                                </svg>
                            </div>
                            <h3>Markdown Rendering</h3>
                            <p>
                                Beautiful markdown with syntax highlighting for
                                code blocks in over 100 languages.
                            </p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke-width="1.5"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                                    />
                                </svg>
                            </div>
                            <h3>Keyboard Navigation</h3>
                            <p>
                                Navigate with arrow keys,
                                <span class="kbd">j</span>/<span class="kbd"
                                    >k</span
                                >
                                for Vim users. Press
                                <span class="kbd">Enter</span> to open.
                            </p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke-width="1.5"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M14.25 9.75 16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z"
                                    />
                                </svg>
                            </div>
                            <h3>REST API</h3>
                            <p>
                                Programmatic access via REST. Full OpenAPI spec
                                available at <code>/api/openapi.json</code>.
                            </p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke-width="1.5"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25"
                                    />
                                </svg>
                            </div>
                            <h3>Cross-Platform</h3>
                            <p>
                                Works on macOS, Linux, and Windows. Standalone
                                binaries (~57MB) for systems without Node.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section class="installation" id="installation">
                <div class="container">
                    <h2>Get started</h2>
                    <div class="install-tabs">
                        <button
                            v-for="method in installMethods"
                            :key="method.id"
                            class="install-tab"
                            :class="{ active: activeTab === method.id }"
                            @click="activeTab = method.id"
                        >
                            {{ method.label }}
                        </button>
                    </div>
                    <div class="install-panel">
                        <template v-for="method in installMethods" :key="method.id">
                            <div v-if="activeTab === method.id" class="install-panel-content">
                                <div v-if="method.command" class="install-command">
                                    <code>{{ method.command }}</code>
                                    <button
                                        class="copy-btn"
                                        :class="{ copied: copiedStates[method.id] }"
                                        @click="copyToClipboard(method.command, method.id)"
                                    >
                                        {{ copiedStates[method.id] ? "Copied!" : "Copy" }}
                                    </button>
                                </div>
                                <a
                                    v-else
                                    :href="method.link"
                                    class="install-download-link"
                                    target="_blank"
                                    rel="noopener"
                                >
                                    Download from Releases →
                                </a>
                                <p class="install-hint">{{ method.hint }}</p>
                            </div>
                        </template>
                    </div>
                </div>
            </section>
        </main>

        <footer>
            <div class="container">
                <div class="footer-links">
                    <a
                        href="https://github.com/HelgeSverre/claude-plan-viewer"
                        target="_blank"
                        rel="noopener"
                        >GitHub</a
                    >
                    <a
                        href="https://npmjs.com/package/claude-plan-viewer"
                        target="_blank"
                        rel="noopener"
                        >npm</a
                    >
                    <a
                        href="https://github.com/HelgeSverre/claude-plan-viewer/releases"
                        target="_blank"
                        rel="noopener"
                        >Releases</a
                    >
                    <a
                        href="https://github.com/HelgeSverre/claude-plan-viewer/issues"
                        target="_blank"
                        rel="noopener"
                        >Issues</a
                    >
                </div>
                <p class="footer-credit">
                    Built with care by
                    <a
                        href="https://github.com/HelgeSverre"
                        target="_blank"
                        rel="noopener"
                        >Helge Sverre</a
                    >
                </p>
                <p class="disclaimer">
                    Claude and the Claude logo are trademarks of Anthropic, PBC.
                    This project is not affiliated with or endorsed by
                    Anthropic.
                </p>
            </div>
        </footer>
    </div>
</template>
