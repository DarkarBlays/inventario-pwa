const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

class ApiService {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.token = localStorage.getItem('token');
        this.isCheckingConnection = false;
        this.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        this.timeout = import.meta.env.VITE_API_TIMEOUT;
    }

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    }

    async handleResponse(response) {
        const contentType = response.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');
        
        if (!response.ok) {
            let errorMessage = `Error HTTP: ${response.status}`;
            if (isJson) {
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.mensaje || errorData.message || errorMessage;
                } catch (e) {
                    console.error('Error al parsear respuesta de error:', e);
                }
            }
            const error = new Error(errorMessage);
            error.status = response.status;
            throw error;
        }

        if (isJson) {
            return response.json();
        }
        
        return response.text();
    }

    async checkConnection() {
        // Evitar múltiples verificaciones simultáneas
        if (this.isCheckingConnection) {
            return false;
        }

        try {
            this.isCheckingConnection = true;
            
            if (!navigator.onLine) {
                console.log('Navegador reporta sin conexión');
                return false;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 segundos timeout

            const response = await fetch(`${this.baseURL}/estado`, {
                method: 'GET',
                headers: this.getHeaders(),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            console.error('Error de conexión:', error);
            return false;
        } finally {
            this.isCheckingConnection = false;
        }
    }

    async get(url, config = {}) {
        try {
            const response = await fetch(`${this.baseURL}${url}`, {
                method: 'GET',
                headers: this.getHeaders(),
                ...config
            });
            return this.handleResponse(response);
        } catch (error) {
            if (!navigator.onLine) {
                const cachedResponse = await caches.match(`${this.baseURL}${url}`);
                if (cachedResponse) {
                    return cachedResponse.json();
                }
            }
            throw error;
        }
    }

    async post(url, data = {}, config = {}) {
        try {
            // Para login, intentamos directamente sin verificar conexión
            if (!url.includes('/login')) {
                const isConnected = await this.checkConnection();
                if (!isConnected) {
                    throw new Error('No se puede conectar con el servidor');
                }
            }

            console.log('Enviando POST a:', `${this.baseURL}${url}`);
            console.log('Datos:', url.includes('login') ? { ...data, password: '***' } : data);

            const response = await fetch(`${this.baseURL}${url}`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data),
                ...config
            });

            const result = await this.handleResponse(response);
            
            // Si es login exitoso, actualizar el token
            if (url.includes('/login') && result.token) {
                localStorage.setItem('token', result.token);
                this.token = result.token;
            }

            return result;
        } catch (error) {
            console.error('Error en POST:', error);
            
            // Si es un error de red o timeout, marcar como offline
            if (!navigator.onLine || error.name === 'AbortError' || error.message.includes('Failed to fetch')) {
                if (!url.includes('/login')) {
                    await this.saveForSync('POST', url, data);
                }
                throw new Error('No hay conexión a internet');
            }
            
            throw error;
        }
    }

    async put(url, data = {}, config = {}) {
        try {
            const response = await fetch(`${this.baseURL}${url}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(data),
                ...config
            });
            return this.handleResponse(response);
        } catch (error) {
            if (!navigator.onLine) {
                await this.saveForSync('PUT', url, data);
            }
            throw error;
        }
    }

    async delete(url, config = {}) {
        try {
            const response = await fetch(`${this.baseURL}${url}`, {
                method: 'DELETE',
                headers: this.getHeaders(),
                ...config
            });
            return this.handleResponse(response);
        } catch (error) {
            if (!navigator.onLine) {
                await this.saveForSync('DELETE', url);
            }
            throw error;
        }
    }

    async saveForSync(method, url, data = null) {
        const syncData = {
            method,
            url,
            data,
            timestamp: new Date().toISOString()
        };

        const pendingSync = JSON.parse(localStorage.getItem('pendingSync') || '[]');
        pendingSync.push(syncData);
        localStorage.setItem('pendingSync', JSON.stringify(pendingSync));

        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.ready;
                if ('sync' in registration) {
                    await registration.sync.register('sync-productos');
                }
            } catch (error) {
                console.error('Error al registrar sync:', error);
            }
        }
    }

    async syncPendingData() {
        const pendingSync = JSON.parse(localStorage.getItem('pendingSync') || '[]');
        const failedSync = [];

        for (const item of pendingSync) {
            try {
                const response = await fetch(`${this.baseURL}${item.url}`, {
                    method: item.method,
                    headers: this.headers,
                    body: item.data ? JSON.stringify(item.data) : undefined
                });

                if (!response.ok) {
                    failedSync.push(item);
                }
            } catch (error) {
                failedSync.push(item);
            }
        }

        localStorage.setItem('pendingSync', JSON.stringify(failedSync));
    }
}

export const apiService = new ApiService(); 