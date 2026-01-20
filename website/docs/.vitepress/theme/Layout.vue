<script setup>
import { useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import CustomHome from './CustomHome.vue'

const { frontmatter } = useData()
</script>

<template>
  <CustomHome v-if="frontmatter.layout === 'custom-home'" />
  <DefaultTheme.Layout v-else />
</template>
