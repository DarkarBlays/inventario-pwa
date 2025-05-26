// Obtener el puerto del backend del localStorage o usar el predeterminado
const API_PORT = localStorage.getItem('api_port') || '3000';
const API_URL = `http://localhost:${API_PORT}/api`;

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = [
    '/usuarios/login',
    '/usuarios/registro'
];

// Rutas especiales que requieren manejo específico
const SPECIAL_ROUTES = {
    LOGOUT: '/usuarios/logout'
};

// Función para manejar errores de red
const handleNetworkError = async (error) => {
    if (!navigator.onLine) {
        throw new Error('No hay conexión a internet');
    }
    throw error;
};

// Función para verificar el estado de la respuesta
const handleResponse = async (response) => {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ mensaje: 'Error en el servidor' }));
        throw new Error(error.mensaje || `Error ${response.status}: ${response.statusText}`);
    }
    try {
        const data = await response.json();
        return data;
    } catch (error) {
        throw new Error('Error al procesar la respuesta del servidor');
    }
};

// Función para obtener los headers según el endpoint
const getHeaders = (endpoint) => {
    const headers = {
        'Content-Type': 'application/json'
    };

    // Si es la ruta de logout, intentar obtener el token pero no fallar si no existe
    if (endpoint === SPECIAL_ROUTES.LOGOUT) {
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    // Para otras rutas protegidas
    if (!PUBLIC_ROUTES.includes(endpoint)) {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No hay token de autenticación');
        }
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
};

export const api = {
    async get(endpoint) {
        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                headers: getHeaders(endpoint)
            });
            return handleResponse(response);
        } catch (error) {
            return handleNetworkError(error);
        }
    },

    async post(endpoint, data) {
        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: getHeaders(endpoint),
                body: JSON.stringify(data)
            });
            return handleResponse(response);
        } catch (error) {
            return handleNetworkError(error);
        }
    },

    async put(endpoint, data) {
        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'PUT',
                headers: getHeaders(endpoint),
                body: JSON.stringify(data)
            });
            return handleResponse(response);
        } catch (error) {
            return handleNetworkError(error);
        }
    },

    async delete(endpoint) {
        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'DELETE',
                headers: getHeaders(endpoint)
            });
            return handleResponse(response);
        } catch (error) {
            return handleNetworkError(error);
        }
    }
}; 