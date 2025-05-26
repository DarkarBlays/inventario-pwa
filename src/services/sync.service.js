import { useProductStore } from '../stores/productStore';
import { useAuthStore } from '../stores/auth.store';

class SyncService {
    constructor() {
        this.syncInterval = null;
        this.initialize();
    }

    initialize() {
        // Escuchar cambios en la conexión
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());

        // Iniciar sincronización si estamos online
        if (navigator.onLine) {
            this.startSync();
        }
    }

    async handleOnline() {
        console.log('Conexión recuperada - Iniciando sincronización...');
        const authStore = useAuthStore();
        const productStore = useProductStore();

        if (authStore.estaAutenticado) {
            try {
                await authStore.sincronizarCredenciales();
                await productStore.syncOfflineProducts();
                this.startSync();
            } catch (error) {
                console.error('Error en la sincronización al recuperar conexión:', error);
            }
        }
    }

    handleOffline() {
        console.log('Conexión perdida - Deteniendo sincronización');
        this.stopSync();
    }

    startSync() {
        if (this.syncInterval) return;

        this.syncInterval = setInterval(async () => {
            const authStore = useAuthStore();
            const productStore = useProductStore();

            if (authStore.estaAutenticado && navigator.onLine) {
                try {
                    await productStore.syncWithBackend();
                } catch (error) {
                    console.error('Error en la sincronización automática:', error);
                }
            }
        }, 300000); // Sincronizar cada 5 minutos
    }

    stopSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    async forceSyncNow() {
        if (!navigator.onLine) {
            console.log('No hay conexión para sincronizar');
            return;
        }

        const authStore = useAuthStore();
        const productStore = useProductStore();

        if (authStore.estaAutenticado) {
            try {
                await productStore.syncOfflineProducts();
                await productStore.syncWithBackend();
            } catch (error) {
                console.error('Error en la sincronización forzada:', error);
                throw error;
            }
        }
    }
}

export const syncService = new SyncService(); 