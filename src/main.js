import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/css/main.css'
import { configureServiceWorker } from './services/serviceWorkerConfig'
import { setupConnectionHandlers } from './services/connectionHandler'
import { initializeDatabase, initializeStores } from './services/appInitializer'

// Registrar Service Worker
const updateSW = configureServiceWorker();

// Función de inicialización asíncrona
async function initializeApp() {
  try {
    console.log('Iniciando aplicación...');
    
    // Inicializar IndexedDB
    await initializeDatabase();
    
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

    // Inicializar stores
    await initializeStores(authStore, productStore);

    // Configurar manejo de conexión
    setupConnectionHandlers(authStore);

    // Montar la aplicación
    app.mount('#app');
    console.log('Aplicación montada correctamente');

  } catch (error) {
    console.error('Error al inicializar la aplicación:', error);
  }
}

// Iniciar la aplicación
console.log('Iniciando proceso de inicialización...');
initializeApp().catch(error => {
  console.error('Error fatal durante la inicialización:', error);
});
