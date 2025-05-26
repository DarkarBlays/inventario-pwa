import { api } from './api';
import { saveAuthData, getAuthData, clearAuthData } from './indexedDB';

const OFFLINE_CREDENTIALS_KEY = 'offline_credentials';

export const authService = {
    async login(email, password) {
        try {
            if (navigator.onLine) {
                // Intento de login online
                const response = await api.post('/usuarios/login', { email, password });
                if (!response || !response.token || !response.usuario) {
                    throw new Error('Respuesta de autenticación inválida');
                }
                
                // Guardar credenciales para uso offline
                const credentials = {
                    email,
                    password: btoa(password), // Codificación básica
                    token: response.token,
                    usuario: response.usuario,
                    timestamp: new Date().toISOString()
                };

                // Guardar en IndexedDB y localStorage
                await saveAuthData(credentials);
                localStorage.setItem(OFFLINE_CREDENTIALS_KEY, JSON.stringify(credentials));
                localStorage.setItem('token', response.token);
                localStorage.setItem('usuario', JSON.stringify(response.usuario));
                
                return response;
            } else {
                // Intento de login offline
                const storedCredentials = await getAuthData() || 
                                        JSON.parse(localStorage.getItem(OFFLINE_CREDENTIALS_KEY) || 'null');
                
                if (!storedCredentials) {
                    throw new Error('No hay credenciales almacenadas para uso offline');
                }

                if (email === storedCredentials.email && btoa(password) === storedCredentials.password) {
                    localStorage.setItem('token', storedCredentials.token);
                    localStorage.setItem('usuario', JSON.stringify(storedCredentials.usuario));
                    return {
                        token: storedCredentials.token,
                        usuario: storedCredentials.usuario,
                        offline: true
                    };
                }
                throw new Error('Credenciales incorrectas');
            }
        } catch (error) {
            console.error('Error en login:', error);
            throw error;
        }
    },

    async registro(userData) {
        if (!navigator.onLine) {
            throw new Error('Se requiere conexión a internet para registrarse');
        }
        try {
            const response = await api.post('/usuarios/registro', userData);
            return response;
        } catch (error) {
            console.error('Error en registro:', error);
            throw error;
        }
    },

    async obtenerPerfil() {
        try {
            if (navigator.onLine) {
                const response = await api.get('/usuarios/perfil');
                // Actualizar datos locales con la respuesta del servidor
                if (response.data) {
                    const authData = await getAuthData();
                    if (authData) {
                        await saveAuthData({
                            ...authData,
                            usuario: response.data
                        });
                    }
                }
                return response;
            } else {
                const authData = await getAuthData();
                if (!authData) {
                    throw new Error('No hay perfil almacenado');
                }
                return { data: authData.usuario, offline: true };
            }
        } catch (error) {
            console.error('Error al obtener perfil:', error);
            throw error;
        }
    },

    async cerrarSesion() {
        try {
            // Primero intentar cerrar sesión en el servidor si estamos online
            if (navigator.onLine) {
                try {
                    const token = localStorage.getItem('token');
                    if (token) {
                        await api.post('/usuarios/logout');
                    }
                } catch (error) {
                    console.error('Error al cerrar sesión en el servidor:', error);
                    // Continuamos con la limpieza local incluso si hay error en el servidor
                }
            }
            
            // Después limpiamos los datos locales
            await clearAuthData();
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
            localStorage.removeItem(OFFLINE_CREDENTIALS_KEY);
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            throw error;
        }
    },

    async obtenerUsuarioActual() {
        try {
            const authData = await getAuthData();
            if (authData) {
                return authData.usuario;
            }
            const usuario = localStorage.getItem('usuario');
            return usuario ? JSON.parse(usuario) : null;
        } catch (error) {
            console.error('Error al obtener usuario actual:', error);
            return null;
        }
    },

    async estaAutenticado() {
        try {
            const authData = await getAuthData();
            return !!authData || !!localStorage.getItem('token');
        } catch (error) {
            console.error('Error al verificar autenticación:', error);
            return false;
        }
    },

    async sincronizarCredenciales() {
        if (!navigator.onLine) return;

        try {
            const authData = await getAuthData();
            if (authData) {
                const response = await api.post('/usuarios/login', {
                    email: authData.email,
                    password: atob(authData.password)
                });

                if (response && response.token) {
                    const newAuthData = {
                        ...authData,
                        token: response.token,
                        usuario: response.usuario,
                        timestamp: new Date().toISOString()
                    };
                    
                    await saveAuthData(newAuthData);
                    localStorage.setItem(OFFLINE_CREDENTIALS_KEY, JSON.stringify(newAuthData));
                    localStorage.setItem('token', response.token);
                    localStorage.setItem('usuario', JSON.stringify(response.usuario));
                }
            }
        } catch (error) {
            console.error('Error al sincronizar credenciales:', error);
        }
    }
}; 