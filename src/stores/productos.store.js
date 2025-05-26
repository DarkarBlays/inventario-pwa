import { defineStore } from 'pinia';
import { productosService } from '../services/productos.service';

export const useProductosStore = defineStore('productos', {
    state: () => ({
        productos: [],
        productoSeleccionado: null,
        error: null,
        cargando: false,
        estadoSincronizacion: 'sincronizado' // 'sincronizado' | 'pendiente'
    }),

    getters: {
        obtenerProductos: (state) => state.productos,
        hayProductosPendientes: (state) => state.productos.some(p => p.pendienteSincronizacion),
        obtenerEstadoSincronizacion: (state) => state.estadoSincronizacion
    },

    actions: {
        async cargarProductos() {
            try {
                this.cargando = true;
                this.error = null;
                const productos = await productosService.obtenerTodos();
                this.productos = productos;
                this.actualizarEstadoSincronizacion();
            } catch (error) {
                this.error = error.message;
            } finally {
                this.cargando = false;
            }
        },

        async crearProducto(producto) {
            try {
                this.cargando = true;
                this.error = null;
                const nuevoProducto = await productosService.crear(producto);
                this.productos.push(nuevoProducto);
                this.actualizarEstadoSincronizacion();
                return nuevoProducto;
            } catch (error) {
                this.error = error.message;
                return null;
            } finally {
                this.cargando = false;
            }
        },

        async actualizarProducto(id, producto) {
            try {
                this.cargando = true;
                this.error = null;
                const productoActualizado = await productosService.actualizar(id, producto);
                const index = this.productos.findIndex(p => p.id === id);
                if (index !== -1) {
                    this.productos[index] = productoActualizado;
                }
                this.actualizarEstadoSincronizacion();
                return productoActualizado;
            } catch (error) {
                this.error = error.message;
                return null;
            } finally {
                this.cargando = false;
            }
        },

        async eliminarProducto(id) {
            try {
                this.cargando = true;
                this.error = null;
                await productosService.eliminar(id);
                this.productos = this.productos.filter(p => p.id !== id);
                this.actualizarEstadoSincronizacion();
                return true;
            } catch (error) {
                this.error = error.message;
                return false;
            } finally {
                this.cargando = false;
            }
        },

        async sincronizar() {
            if (!navigator.onLine) {
                this.error = 'No hay conexión a internet';
                return;
            }

            try {
                this.cargando = true;
                this.error = null;
                await productosService.sincronizar();
                await this.cargarProductos();
                this.estadoSincronizacion = 'sincronizado';
            } catch (error) {
                this.error = error.message;
            } finally {
                this.cargando = false;
            }
        },

        actualizarEstadoSincronizacion() {
            this.estadoSincronizacion = this.hayProductosPendientes ? 'pendiente' : 'sincronizado';
        },

        seleccionarProducto(producto) {
            this.productoSeleccionado = producto;
        }
    }
}); 