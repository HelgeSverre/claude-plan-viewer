import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Claude Plan Viewer",
  description: "Browse, search, and read your Claude Code plans",

  sitemap: {
    hostname: "https://claudeplans.dev",
  },

  lastUpdated: true,

  ignoreDeadLinks: [/^http:\/\/localhost/],

  head: [
    ["link", { rel: "icon", href: "/logo-light.svg" }],
    [
      "script",
      {
        src: "https://analytics.ahrefs.com/analytics.js",
        "data-key": "t9QdDbz06hCPNLZygm2ccA",
        async: "",
      },
    ],
  ],

  themeConfig: {
    logo: {
      light: "/logo-light.svg",
      dark: "/logo-dark.svg",
      width: 28,
      height: 28,
    },

    nav: [],

    sidebar: [
      {
        text: "Getting Started",
        items: [
          { text: "Overview", link: "/introduction/overview" },
          { text: "Installation", link: "/introduction/installation" },
          { text: "Quick Start", link: "/introduction/quickstart" },
        ],
      },
      {
        text: "Usage",
        items: [
          { text: "Load from JSON", link: "/guides/load-from-json" },
          { text: "Custom Directory", link: "/guides/custom-directory" },
          { text: "JSON Export", link: "/guides/json-export" },
        ],
      },
      {
        text: "Reference",
        items: [
          { text: "CLI", link: "/reference/cli" },
          { text: "REST API", link: "/reference/api" },
          { text: "API Playground", link: "/reference/api-playground" },
          { text: "Troubleshooting", link: "/reference/troubleshooting" },
        ],
      },
      {
        text: "Contributing",
        items: [
          { text: "Building", link: "/contributing/building" },
          { text: "Testing", link: "/contributing/testing" },
        ],
      },
    ],

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/HelgeSverre/claude-plan-viewer",
      },
      { icon: "npm", link: "https://www.npmjs.com/package/claude-plan-viewer" },
    ],

    search: {
      provider: "local",
    },
  },
});
