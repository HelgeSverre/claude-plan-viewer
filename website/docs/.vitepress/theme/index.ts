import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import ApiReference from './ApiReference.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('ApiReference', ApiReference)
  }
}
