import { registerSW } from 'virtual:pwa-register'

export function configureServiceWorker() {
  return registerSW({
    onNeedRefresh() {
      console.log('Nueva versión disponible de la aplicación');
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
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    },
    immediate: true
  });
} 