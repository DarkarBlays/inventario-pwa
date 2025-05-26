import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/css/main.css'
import { syncService } from './services/sync.service'
import { registerSW } from 'virtual:pwa-register'
import { initDB } from './services/indexedDB'

// Función de inicialización asíncrona
async function initializeApp() {
  try {
    console.log('Iniciando aplicación...');
    
    // Inicializar IndexedDB primero y esperar a que termine
    console.log('Inicializando IndexedDB...');
    await initDB();
    console.log('IndexedDB inicializada correctamente');

    // Crear la instancia de Pinia
    const pinia = createPinia();

    // Crear la aplicación
    const app = createApp(App);

    // Instalar Pinia
    app.use(pinia);

    // Configurar el router
    app.use(router);

    // Inicializar los stores después de que Pinia esté instalada
    const { useAuthStore } = await import('./stores/auth.store');
    const { useProductStore } = await import('./stores/productStore');

    const authStore = useAuthStore();
    const productStore = useProductStore();

    // Inicializar el estado de autenticación
    console.log('Inicializando estado de autenticación...');
    await authStore.inicializarAuth();

    // Inicializar el store de productos si el usuario está autenticado y no hay productos cargados
    if (authStore.estaAutenticado && productStore.getProducts.length === 0) {
      console.log('Usuario autenticado, inicializando store de productos...');
      await productStore.initializeStore();
    }

    // Inicializar el servicio de sincronización
    syncService;

    // Registrar Service Worker
    const updateSW = registerSW({
      onNeedRefresh() {
        console.log('Nueva versión disponible!');
      },
      onOfflineReady() {
        console.log('App lista para uso offline!');
      },
      immediate: true
    });

    // Montar la aplicación
    app.mount('#app');
    console.log('Aplicación montada correctamente');

    // Manejar eventos de conexión
    window.addEventListener('online', async () => {
      console.log('Conexión recuperada');
      if (authStore.estaAutenticado) {
        await productStore.syncOfflineProducts();
        authStore.setOfflineStatus(false);
      }
    });

    window.addEventListener('offline', () => {
      console.log('Conexión perdida');
      authStore.setOfflineStatus(true);
    });

    // Establecer estado inicial de conexión
    authStore.setOfflineStatus(!navigator.onLine);
    console.log('Estado de conexión inicial:', navigator.onLine ? 'online' : 'offline');

  } catch (error) {
    console.error('Error al inicializar la aplicación:', error);
  }
}

// Iniciar la aplicación
console.log('Iniciando proceso de inicialización...');
initializeApp();
