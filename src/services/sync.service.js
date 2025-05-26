import { useProductStore } from '../stores/productStore';
import { useAuthStore } from '../stores/auth.store';

class SyncService {
    constructor() {
        this.setupConnectionListeners();
    }

    setupConnectionListeners() {
        window.addEventListener('online', this.handleConnectionRestore.bind(this));
        window.addEventListener('offline', this.handleConnectionLost.bind(this));
    }

    async handleConnectionRestore() {
        console.log('Conexión restaurada - Iniciando sincronización');
        const authStore = useAuthStore();
        const productStore = useProductStore();
        
        if (!authStore.estaAutenticado) {
            console.log('Usuario no autenticado - Sincronización cancelada');
            return;
        }

        try {
            await this.syncAll();
            // En lugar de recargar la página, actualizamos los datos
            await productStore.initializeStore();
            console.log('Sincronización y actualización completada');
        } catch (error) {
            console.error('Error durante la sincronización:', error);
        }
    }

    handleConnectionLost() {
        console.log('Conexión perdida - Modo offline activado');
    }

    async syncAll() {
        const productStore = useProductStore();
        
        try {
            await productStore.syncOfflineProducts();
            console.log('Sincronización completada exitosamente');
        } catch (error) {
            console.error('Error en sincronización:', error);
            throw error;
        }
    }
}

export const syncService = new SyncService(); 