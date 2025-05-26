import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import router from '../router';
import { apiService } from '../services/api.service';
import { useProductStore } from './productStore';
import { clearIndexedDB } from '../services/indexedDB';
import { authService } from '../services/auth.service';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        usuario: JSON.parse(localStorage.getItem('usuario')) || null,
        token: localStorage.getItem('token') || null,
        error: null,
        loading: false,
        isOffline: false
    }),

    actions: {
        async inicializarAuth() {
            try {
                this.loading = true;
                // Verificar si hay una sesión activa
                const estaAutenticado = await authService.estaAutenticado();
                if (estaAutenticado) {
                    const usuario = await authService.obtenerUsuarioActual();
                    const token = localStorage.getItem('token');
                    if (usuario && token) {
                        this.setAuthData(usuario, token);
                        // Si estamos en la página de login, redirigir al inventario
                        if (router.currentRoute.value.name === 'Login') {
                            router.push('/inventory');
                        }
                    }
                } else {
                    this.clearAuthData();
                    if (router.currentRoute.value.name !== 'Login') {
                        router.push('/login');
                    }
                }
            } catch (error) {
                console.error('Error al inicializar auth:', error);
                this.error = error.message;
                this.clearAuthData();
            } finally {
                this.loading = false;
            }
        },

        async login(credentials) {
            try {
                this.loading = true;
                this.error = null;
                
                const response = await authService.login(credentials.email, credentials.password);
                this.setAuthData(response.usuario, response.token);
                
                // Inicializar store de productos después del login solo si es necesario
                const productStore = useProductStore();
                if (productStore.getProducts.length === 0) {
                    await productStore.initializeStore();
                }
                
                router.push('/inventory');
            } catch (error) {
                console.error('Error en login:', error);
                this.error = error.message;
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async register(userData) {
            try {
                this.loading = true;
                this.error = null;
                
                const response = await authService.registro(userData);
                this.setAuthData(response.usuario, response.token);
                
                router.push('/inventory');
            } catch (error) {
                console.error('Error en registro:', error);
                this.error = error.message;
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async logout() {
            try {
                this.loading = true;
                await authService.cerrarSesion();
                
                // Limpiar el estado
                this.clearAuthData();
                
                // Limpiar el store de productos
                const productStore = useProductStore();
                productStore.$reset();
                
                // Redirigir al login
                router.push('/login');
            } catch (error) {
                console.error('Error en logout:', error);
                this.error = error.message;
                
                // Incluso si hay error, intentamos limpiar el estado local
                this.clearAuthData();
                router.push('/login');
            } finally {
                this.loading = false;
            }
        },

        setAuthData(usuario, token) {
            this.usuario = usuario;
            this.token = token;
            this.error = null;
            localStorage.setItem('usuario', JSON.stringify(usuario));
            localStorage.setItem('token', token);
        },

        clearAuthData() {
            this.usuario = null;
            this.token = null;
            this.error = null;
            localStorage.removeItem('usuario');
            localStorage.removeItem('token');
        },

        setOfflineStatus(status) {
            this.isOffline = status;
        }
    },

    getters: {
        estaAutenticado: (state) => !!state.token && !!state.usuario,
        obtenerUsuario: (state) => state.usuario,
        obtenerError: (state) => state.error,
        estaOffline: (state) => state.isOffline
    }
}); 