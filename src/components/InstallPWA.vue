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
      <span>{{ installButtonText }}</span>
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'

const deferredPrompt = ref(null)
const showInstallButton = ref(false)
const isIOS = ref(false)

const installButtonText = computed(() => {
  return isIOS.value ? 'Instalar en iOS' : 'Instalar aplicación'
})

const isInStandaloneMode = () => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone ||
    document.referrer.includes('android-app://')
  )
}

const checkIOSDevice = () => {
  const ua = window.navigator.userAgent
  const iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i)
  const webkit = !!ua.match(/WebKit/i)
  isIOS.value = iOS && webkit && !ua.match(/CriOS/i)
}

const handleBeforeInstallPrompt = (e) => {
  console.log('👋 Evento beforeinstallprompt capturado')
  e.preventDefault()
  deferredPrompt.value = e
  updateInstallButton()
}

const updateInstallButton = () => {
  // No mostrar el botón si ya está en modo standalone
  if (isInStandaloneMode()) {
    console.log('📱 La aplicación ya está instalada')
    showInstallButton.value = false
    return
  }

  // Para iOS, mostrar instrucciones especiales
  if (isIOS.value) {
    console.log('🍎 Dispositivo iOS detectado')
    showInstallButton.value = true
    return
  }

  // Para otros dispositivos, mostrar solo si tenemos el prompt
  showInstallButton.value = !!deferredPrompt.value
}

const showIOSInstructions = () => {
  // Mostrar un modal o alert con instrucciones para iOS
  alert(
    'Para instalar la aplicación en iOS:\n\n' +
    '1. Toca el botón "Compartir" en la barra de Safari (ícono de cuadrado con flecha)\n' +
    '2. Desplázate hacia abajo y toca "Agregar a la pantalla de inicio"\n' +
    '3. Toca "Agregar" en la ventana emergente'
  )
}

const installPWA = async () => {
  if (isIOS.value) {
    showIOSInstructions()
    return
  }

  if (!deferredPrompt.value) {
    console.log('❌ No hay prompt de instalación disponible')
    return
  }

  try {
    console.log('🚀 Mostrando prompt de instalación')
    await deferredPrompt.value.prompt()
    
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
    updateInstallButton()
  }
}

const handleAppInstalled = () => {
  console.log('✅ Aplicación instalada exitosamente')
  showInstallButton.value = false
  deferredPrompt.value = null
}

const handleVisibilityChange = () => {
  if (!document.hidden) {
    updateInstallButton()
  }
}

onMounted(() => {
  console.log('🔍 Verificando estado de instalación...')
  
  // Detectar iOS
  checkIOSDevice()
  
  // Verificar estado inicial
  updateInstallButton()
  
  // Configurar event listeners
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.addEventListener('appinstalled', handleAppInstalled)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  
  // Verificar cambios en el modo de visualización
  const mediaQuery = window.matchMedia('(display-mode: standalone)')
  mediaQuery.addListener(updateInstallButton)
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.removeEventListener('appinstalled', handleAppInstalled)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  
  const mediaQuery = window.matchMedia('(display-mode: standalone)')
  mediaQuery.removeListener(updateInstallButton)
})
</script> 