<template>
  <div class="api-reference-container">
    <div id="scalar-api-reference"></div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useData } from 'vitepress'

const { isDark } = useData()

onMounted(() => {
  // Dynamically load Scalar
  const script = document.createElement('script')
  script.src = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference'
  script.onload = () => {
    window.Scalar.createApiReference('#scalar-api-reference', {
      spec: {
        url: '/openapi.json'
      },
      // Theme & Layout
      theme: 'saturn',
      layout: 'modern',
      darkMode: isDark.value,
      withDefaultFonts: true,

      // Metadata
      title: 'Claude Plan Viewer API',

      // Sidebar & Navigation
      showSidebar: true,
      defaultOpenAllTags: false,

      // UI Elements
      hideDownloadButton: false,
      hideDarkModeToggle: true,
      hideClientButton: true,
      hideSearch: true,
      hideTestRequestButton: true,
      hideModels: false,

      // Operation Display
      operationTitleSource: 'summary',
      showOperationId: false,
      expandAllModelSections: true,
      expandAllResponses: false,

      // Schema Display
      orderSchemaPropertiesBy: 'alpha',
      orderRequiredPropertiesFirst: true,

      // Developer Tools
      showDeveloperTools: 'never',
      showToolbar: 'never',

      // Download & Export
      documentDownloadType: 'both',

      // Privacy & Other
      telemetry: false,
      persistAuth: false,
      isEditable: false,
      searchHotKey: 'k',
    })
  }
  document.head.appendChild(script)
})
</script>

<style scoped>
.api-reference-container {
  min-height: 80vh;
  width: 100%;
}

/* Override Scalar styles to match VitePress theme */
:deep(.scalar-app) {
  --scalar-font: var(--vp-font-family-base);
  --scalar-color-1: var(--vp-c-text-1);
  --scalar-color-2: var(--vp-c-text-2);
  --scalar-color-3: var(--vp-c-text-3);
  --scalar-background-1: var(--vp-c-bg);
  --scalar-background-2: var(--vp-c-bg-soft);
  --scalar-background-3: var(--vp-c-bg-mute);
  --scalar-border-color: var(--vp-c-border);
  --scalar-color-accent: var(--vp-c-brand-1);
}
</style>
