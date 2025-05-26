const API_BASE_URL = 'http://localhost:3000/api';

class ApiService {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    getHeaders() {
        const token = localStorage.getItem('token');
        return {
            ...this.headers,
            'Authorization': token ? `Bearer ${token}` : ''
        };
    }

    async handleResponse(response) {
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('token');
                localStorage.removeItem('usuario');
                window.location.href = '/login';
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return { data, status: response.status };
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
            const response = await fetch(`${this.baseURL}${url}`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data),
                ...config
            });
            return this.handleResponse(response);
        } catch (error) {
            if (!navigator.onLine) {
                await this.saveForSync('POST', url, data);
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