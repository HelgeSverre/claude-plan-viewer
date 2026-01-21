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

    nav: [
      { text: "Guide", link: "/getting-started/quickstart" },
      { text: "Reference", link: "/reference/cli" },
      {
        text: "GitHub",
        link: "https://github.com/HelgeSverre/claude-plan-viewer",
      },
    ],

    sidebar: [
      {
        text: "Getting Started",
        items: [
          { text: "Quick Start", link: "/getting-started/quickstart" },
          { text: "Installation", link: "/getting-started/installation" },
        ],
      },
      {
        text: "Reference",
        items: [
          { text: "CLI Options", link: "/reference/cli" },
          { text: "REST API", link: "/reference/api" },
          { text: "API Playground", link: "/reference/api-playground" },
        ],
      },
      {
        text: "Features",
        items: [
          { text: "JSON Export", link: "/features/json-export" },
          { text: "Load from File", link: "/features/load-from-file" },
          { text: "Custom Directory", link: "/features/custom-directory" },
        ],
      },
      {
        text: "Development",
        items: [
          { text: "Building", link: "/development/building" },
          { text: "Testing", link: "/development/testing" },
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
