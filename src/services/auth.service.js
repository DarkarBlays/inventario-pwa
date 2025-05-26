import { api } from './api';
import { saveAuthData, clearAuthData, getDB, STORES, initDB } from './indexedDB';

const OFFLINE_CREDENTIALS_KEY = 'offline_credentials';

const comparePasswords = async (inputPassword, storedPassword) => {
    try {
        // Decodificar la contraseña almacenada
        const decodedPassword = atob(storedPassword);
        return inputPassword === decodedPassword;
    } catch (error) {
        console.error('Error al comparar contraseñas:', error);
        return false;
    }
};

const getAuthData = async () => {
    try {
        await initDB(); // Aseguramos que la DB está inicializada
        const db = getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.AUTH], 'readonly');
            const store = transaction.objectStore(STORES.AUTH);
            const request = store.getAll();

            request.onsuccess = () => {
                const result = request.result[0];
                resolve(result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('Error al obtener datos de autenticación:', error);
        return null;
    }
};

export const authService = {
    async login(credentials) {
        try {
            console.log('Iniciando proceso de login...');
            
            // Verificar si hay credenciales almacenadas antes de intentar online
            const storedAuthData = await getAuthData();
            const offlineAvailable = storedAuthData && 
                                   storedAuthData.email === credentials.email &&
                                   await comparePasswords(credentials.password, storedAuthData.password);

            // Intentar login online si hay conexión
            if (navigator.onLine) {
                try {
                    console.log('Intentando login online...');
                    const response = await api.post('/usuarios/login', credentials);
                    
                    if (!response || !response.token || !response.usuario) {
                        throw new Error('Respuesta de autenticación inválida');
                    }

                    // Preparar datos para IndexedDB
                    const authData = {
                        email: credentials.email,
                        password: btoa(credentials.password),
                        token: response.token,
                        usuario: response.usuario,
                        timestamp: new Date().toISOString()
                    };

                    // Guardar datos offline
                    await Promise.all([
                        saveAuthData(authData),
                        localStorage.setItem(OFFLINE_CREDENTIALS_KEY, JSON.stringify(authData)),
                        localStorage.setItem('token', response.token),
                        localStorage.setItem('usuario', JSON.stringify(response.usuario))
                    ]);

                    console.log('Login online exitoso');
                    return {
                        token: response.token,
                        usuario: response.usuario,
                        offline: false
                    };
                } catch (onlineError) {
                    console.error('Error en login online:', onlineError);
                    
                    // Si hay credenciales offline válidas, usarlas como fallback
                    if (offlineAvailable) {
                        console.log('Usando credenciales offline como fallback');
                        return {
                            token: storedAuthData.token,
                            usuario: storedAuthData.usuario,
                            offline: true
                        };
                    }
                    
                    throw onlineError;
                }
            }

            // Login offline
            console.log('Intentando login offline...');
            
            if (!storedAuthData) {
                throw new Error('No hay credenciales almacenadas para modo offline');
            }

            if (!offlineAvailable) {
                throw new Error('Credenciales inválidas en modo offline');
            }

            // Actualizar localStorage para mantener consistencia
            localStorage.setItem('token', storedAuthData.token);
            localStorage.setItem('usuario', JSON.stringify(storedAuthData.usuario));

            console.log('Login offline exitoso');
            return {
                token: storedAuthData.token,
                usuario: storedAuthData.usuario,
                offline: true
            };
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
                if (response.data) {
                    const authData = await getAuthData();
                    if (authData) {
                        const updatedAuthData = {
                            ...authData,
                            usuario: response.data
                        };
                        await saveAuthData(updatedAuthData);
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
            if (navigator.onLine) {
                try {
                    const token = localStorage.getItem('token');
                    if (token) {
                        await api.post('/usuarios/logout');
                    }
                } catch (error) {
                    console.error('Error al cerrar sesión en el servidor:', error);
                }
            }
            
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
    },

    async logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        
        // Limpiar datos de autenticación en IndexedDB
        const db = getDB();
        const transaction = db.transaction([STORES.AUTH], 'readwrite');
        const store = transaction.objectStore(STORES.AUTH);
        await store.clear();
    },

    isAuthenticated() {
        return !!localStorage.getItem('token');
    }
};

export default authService; 