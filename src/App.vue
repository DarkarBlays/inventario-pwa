<script setup>
import { onMounted } from 'vue'
import InstallPWA from './components/InstallPWA.vue'

onMounted(() => {
  // Escuchar cambios en la conexión
  window.addEventListener('online', () => {
    document.dispatchEvent(new CustomEvent('connection-changed', { detail: { online: true } }))
  })

  window.addEventListener('offline', () => {
    document.dispatchEvent(new CustomEvent('connection-changed', { detail: { online: false } }))
  })
})
</script>

<template>
  <router-view></router-view>
  <InstallPWA />
</template>

<style>
@tailwind base;
@tailwind components;
@tailwind utilities;
</style>
