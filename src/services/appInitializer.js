import { initDB } from './indexedDB';

export async function initializeStores(authStore, productStore) {
  try {
    console.log('Inicializando estado de autenticación...');
    await authStore.inicializarAuth();

    if (authStore.estaAutenticado) {
      try {
        await productStore.initializeStore();
      } catch (error) {
        console.error('Error al inicializar productos:', error);
      }
    }
  } catch (error) {
    console.error('Error al inicializar stores:', error);
  }
}

export async function initializeDatabase() {
  console.log('Inicializando IndexedDB...');
  try {
    await initDB();
    console.log('IndexedDB inicializada correctamente');
  } catch (dbError) {
    console.error('Error al inicializar IndexedDB:', dbError);
    // Continuar con la inicialización aunque falle IndexedDB
  }
} 