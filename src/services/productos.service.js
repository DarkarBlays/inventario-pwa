import { api } from './api';

const STORE_NAME = 'productos-offline';
const SYNC_QUEUE = 'sync-queue';

export const productosService = {
    async obtenerTodos() {
        try {
            if (!navigator.onLine) {
                return this.obtenerProductosOffline();
            }
            const productos = await api.get('/productos');
            await this.guardarProductosOffline(productos);
            return productos;
        } catch (error) {
            console.error('Error al obtener productos:', error);
            return this.obtenerProductosOffline();
        }
    },

    async crear(producto) {
        try {
            if (!navigator.onLine) {
                return this.guardarProductoOffline(producto);
            }
            const nuevoProducto = await api.post('/productos', producto);
            await this.actualizarProductoOffline(nuevoProducto);
            return nuevoProducto;
        } catch (error) {
            console.error('Error al crear producto:', error);
            return this.guardarProductoOffline(producto);
        }
    },

    async actualizar(id, producto) {
        try {
            if (!navigator.onLine) {
                return this.actualizarProductoOffline({ ...producto, id });
            }
            const productoActualizado = await api.put(`/productos/${id}`, producto);
            await this.actualizarProductoOffline(productoActualizado);
            return productoActualizado;
        } catch (error) {
            console.error('Error al actualizar producto:', error);
            return this.actualizarProductoOffline({ ...producto, id });
        }
    },

    async eliminar(id) {
        try {
            if (!navigator.onLine) {
                return this.eliminarProductoOffline(id);
            }
            await api.delete(`/productos/${id}`);
            await this.eliminarProductoOffline(id);
            return { success: true };
        } catch (error) {
            console.error('Error al eliminar producto:', error);
            return this.eliminarProductoOffline(id);
        }
    },

    // Métodos para manejo offline
    async guardarProductosOffline(productos) {
        localStorage.setItem(STORE_NAME, JSON.stringify(productos));
    },

    async obtenerProductosOffline() {
        const productos = localStorage.getItem(STORE_NAME);
        return productos ? JSON.parse(productos) : [];
    },

    async guardarProductoOffline(producto) {
        const productos = await this.obtenerProductosOffline();
        const nuevoProducto = {
            ...producto,
            id: Date.now(), // ID temporal
            pendienteSincronizacion: true
        };
        productos.push(nuevoProducto);
        await this.guardarProductosOffline(productos);
        await this.agregarAColaSincronizacion({
            tipo: 'crear',
            producto: nuevoProducto
        });
        return nuevoProducto;
    },

    async actualizarProductoOffline(producto) {
        const productos = await this.obtenerProductosOffline();
        const index = productos.findIndex(p => p.id === producto.id);
        if (index !== -1) {
            productos[index] = {
                ...producto,
                pendienteSincronizacion: true
            };
            await this.guardarProductosOffline(productos);
            await this.agregarAColaSincronizacion({
                tipo: 'actualizar',
                producto: productos[index]
            });
        }
        return producto;
    },

    async eliminarProductoOffline(id) {
        const productos = await this.obtenerProductosOffline();
        const productosFiltrados = productos.filter(p => p.id !== id);
        await this.guardarProductosOffline(productosFiltrados);
        await this.agregarAColaSincronizacion({
            tipo: 'eliminar',
            id
        });
        return { success: true };
    },

    // Métodos para sincronización
    async agregarAColaSincronizacion(operacion) {
        const cola = await this.obtenerColaSincronizacion();
        cola.push({
            ...operacion,
            timestamp: Date.now()
        });
        localStorage.setItem(SYNC_QUEUE, JSON.stringify(cola));
    },

    async obtenerColaSincronizacion() {
        const cola = localStorage.getItem(SYNC_QUEUE);
        return cola ? JSON.parse(cola) : [];
    },

    async sincronizar() {
        if (!navigator.onLine) {
            throw new Error('No hay conexión a internet');
        }

        const cola = await this.obtenerColaSincronizacion();
        if (cola.length === 0) {
            return; // No hay nada que sincronizar
        }

        const nuevaCola = [];
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No hay sesión activa');
        }

        for (const operacion of cola) {
            try {
                switch (operacion.tipo) {
                    case 'crear':
                        const nuevoProducto = await api.post('/productos', operacion.producto);
                        await this.actualizarProductoOffline(nuevoProducto);
                        break;
                    case 'actualizar':
                        const productoActualizado = await api.put(`/productos/${operacion.producto.id}`, operacion.producto);
                        await this.actualizarProductoOffline(productoActualizado);
                        break;
                    case 'eliminar':
                        await api.delete(`/productos/${operacion.id}`);
                        break;
                }
            } catch (error) {
                console.error('Error al sincronizar operación:', error);
                if (error.message !== 'No hay conexión a internet') {
                    nuevaCola.push(operacion);
                }
            }
        }

        localStorage.setItem(SYNC_QUEUE, JSON.stringify(nuevaCola));
        
        // Solo actualizar productos si la sincronización fue exitosa
        if (nuevaCola.length === 0) {
            const productos = await api.get('/productos');
            await this.guardarProductosOffline(productos);
        }
    }
}; 