<template>
  <div class="api-reference-container">
    <div id="scalar-api-reference"></div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'

onMounted(async () => {
  // Dynamically load Scalar
  const script = document.createElement('script')
  script.src = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference'
  script.onload = () => {
    window.Scalar.createApiReference('#scalar-api-reference', {
      spec: {
        url: '/openapi.json'
      },
      theme: 'kepler',
      hideDownloadButton: false,
      hideModels: false,
      hideDarkModeToggle: true, // VitePress handles this
      darkMode: document.documentElement.classList.contains('dark')
    })
  }
  document.head.appendChild(script)

  // Watch for dark mode changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'class') {
        const isDark = document.documentElement.classList.contains('dark')
        // Scalar will pick up the change via CSS variables
        const container = document.getElementById('scalar-api-reference')
        if (container) {
          container.classList.toggle('dark-mode', isDark)
        }
      }
    })
  })
  observer.observe(document.documentElement, { attributes: true })
})
</script>

<style scoped>
.api-reference-container {
  min-height: 100vh;
  width: 100%;
}

/* Override Scalar styles to match VitePress theme */
:deep(.scalar-api-reference) {
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
