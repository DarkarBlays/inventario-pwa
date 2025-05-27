import { syncService } from './sync.service';

export function setupConnectionHandlers(authStore) {
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
} 