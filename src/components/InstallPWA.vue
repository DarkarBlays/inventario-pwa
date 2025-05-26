<template>
  <div v-if="showInstallButton" class="fixed bottom-4 right-4 z-50">
    <button
      @click="installPWA"
      class="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-indigo-700 flex items-center space-x-2 transition-all duration-300 transform hover:scale-105"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 2a1 1 0 011 1v6.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L9 9.586V3a1 1 0 011-1z"/>
        <path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/>
      </svg>
      <span>Instalar aplicación</span>
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const deferredPrompt = ref(null)
const showInstallButton = ref(false)

const handleBeforeInstallPrompt = (e) => {
  console.log('👋 Evento beforeinstallprompt capturado')
  e.preventDefault()
  deferredPrompt.value = e
  showInstallButton.value = true
}

const checkInstallState = () => {
  // Verificar si está en modo standalone
  if (window.matchMedia('(display-mode: standalone)').matches) {
    console.log('📱 La aplicación ya está instalada')
    showInstallButton.value = false
    return
  }

  // Verificar en iOS
  if (
    navigator.standalone ||
    window.navigator.standalone === true
  ) {
    console.log('📱 La aplicación ya está instalada (iOS)')
    showInstallButton.value = false
    return
  }

  // En Android/Desktop, mostrar el botón si tenemos el evento guardado
  showInstallButton.value = !!deferredPrompt.value
}

const installPWA = async () => {
  if (!deferredPrompt.value) {
    console.log('❌ No hay prompt de instalación disponible')
    return
  }

  try {
    console.log('🚀 Mostrando prompt de instalación')
    deferredPrompt.value.prompt()
    
    const { outcome } = await deferredPrompt.value.userChoice
    console.log(`✨ Resultado de la instalación: ${outcome}`)
    
    if (outcome === 'accepted') {
      console.log('✅ Usuario aceptó instalar la PWA')
      showInstallButton.value = false
    } else {
      console.log('❌ Usuario rechazó la instalación')
    }
  } catch (error) {
    console.error('❌ Error durante la instalación:', error)
  } finally {
    deferredPrompt.value = null
  }
}

onMounted(() => {
  console.log('🔍 Verificando estado de instalación...')
  checkInstallState()
  
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.addEventListener('appinstalled', () => {
    console.log('✅ Aplicación instalada exitosamente')
    showInstallButton.value = false
  })
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
})
</script> 