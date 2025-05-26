import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/css/main.css'
import { syncService } from './services/sync.service'
import { registerSW } from 'virtual:pwa-register'
import { initDB } from './services/indexedDB'

// Registrar Service Worker
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('Nueva versión disponible de la aplicación');
    // Aquí podrías mostrar un diálogo para actualizar
    if (confirm('Hay una nueva versión disponible. ¿Deseas actualizar?')) {
      updateSW();
    }
  },
  onOfflineReady() {
    console.log('Aplicación lista para uso offline');
  },
  onRegistered(swRegistration) {
    console.log('Service Worker registrado:', swRegistration);
    
    // Verificar y manejar actualizaciones
    swRegistration.update().catch(error => {
      console.warn('Error al verificar actualizaciones del SW:', error);
    });

    // Configurar verificación periódica de actualizaciones
    setInterval(() => {
      swRegistration.update().catch(console.warn);
    }, 60 * 60 * 1000); // Cada hora
  },
  onRegisterError(error) {
    console.error('Error al registrar Service Worker:', error);
    // Intentar recuperarse del error
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  },
  immediate: true
});

// Función de inicialización asíncrona
async function initializeApp() {
  try {
    console.log('Iniciando aplicación...');
    
    // Inicializar IndexedDB primero
    console.log('Inicializando IndexedDB...');
    try {
      await initDB();
      console.log('IndexedDB inicializada correctamente');
    } catch (dbError) {
      console.error('Error al inicializar IndexedDB:', dbError);
      // Continuar con la inicialización aunque falle IndexedDB
    }
    
    // Crear la instancia de Pinia y la aplicación
    const pinia = createPinia();
    const app = createApp(App);
    
    // Instalar Pinia y router
    app.use(pinia);
    app.use(router);

    // Importar e inicializar los stores
    const { useAuthStore } = await import('./stores/auth.store');
    const { useProductStore } = await import('./stores/productStore');
    const authStore = useAuthStore();
    const productStore = useProductStore();

    // Inicializar el estado de autenticación
    console.log('Inicializando estado de autenticación...');
    await authStore.inicializarAuth();

    // Montar la aplicación
    app.mount('#app');
    console.log('Aplicación montada correctamente');

    // Configurar manejo de estado offline/online
    const handleConnectionChange = async (isOnline) => {
      console.log(`Conexión ${isOnline ? 'recuperada' : 'perdida'}`);
      authStore.setOfflineStatus(!isOnline);
      
      if (isOnline && authStore.estaAutenticado) {
        try {
          await syncService.forceSyncNow();
        } catch (error) {
          console.error('Error al sincronizar después de recuperar conexión:', error);
        }
      }
    };

    // Configurar listeners de conexión
    window.addEventListener('online', () => handleConnectionChange(true));
    window.addEventListener('offline', () => handleConnectionChange(false));

    // Establecer estado inicial de conexión
    handleConnectionChange(navigator.onLine);

    // Inicializar productos si el usuario está autenticado
    if (authStore.estaAutenticado) {
      try {
        await productStore.initializeStore();
      } catch (error) {
        console.error('Error al inicializar productos:', error);
      }
    }

  } catch (error) {
    console.error('Error al inicializar la aplicación:', error);
  }
}

// Iniciar la aplicación
console.log('Iniciando proceso de inicialización...');
initializeApp().catch(error => {
  console.error('Error fatal durante la inicialización:', error);
});
