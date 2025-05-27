// Exportar STORES como una constante
export const STORES = {
  PRODUCTS: 'products',
  AUTH: 'auth'
};

const DB_NAME = import.meta.env.VITE_DB_NAME || 'inventario_db';
const DB_VERSION = 1; // Mantenemos la versión 1 pero nos aseguramos de crear todos los stores

let db = null;

export const initDB = async () => {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error('Error al abrir IndexedDB:', event.target.error);
        reject(event.target.error);
      };

      request.onsuccess = (event) => {
        db = event.target.result;
        console.log('IndexedDB inicializada correctamente en versión:', db.version);
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        console.log('Creando/actualizando estructura de IndexedDB...');
        const db = event.target.result;

        // Crear store de productos si no existe
        if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
          console.log('Creando store de productos...');
          const productStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
          productStore.createIndex('name', 'name', { unique: false });
          productStore.createIndex('enabled', 'enabled', { unique: false });
        }

        // Crear store de autenticación si no existe
        if (!db.objectStoreNames.contains(STORES.AUTH)) {
          console.log('Creando store de autenticación...');
          const authStore = db.createObjectStore(STORES.AUTH, { keyPath: 'email' });
          authStore.createIndex('email', 'email', { unique: true });
          authStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        console.log('Estructura de IndexedDB creada correctamente');
      };
    } catch (error) {
      console.error('Error en initDB:', error);
      reject(error);
    }
  });
};

export const getDB = () => {
  if (!db) {
    throw new Error('IndexedDB no está inicializada');
  }
  return db;
};

export const getStore = async (storeName, mode = 'readonly') => {
  try {
    if (!db) {
      await initDB();
    }

    if (!db.objectStoreNames.contains(storeName)) {
      throw new Error(`Store '${storeName}' no encontrado. Stores disponibles: ${Array.from(db.objectStoreNames).join(', ')}`);
    }

    const transaction = db.transaction([storeName], mode);
    return transaction.objectStore(storeName);
  } catch (error) {
    console.error(`Error al obtener store '${storeName}':`, error);
    throw error;
  }
};

// Función para eliminar la base de datos y reinicializarla
export const resetDatabase = async () => {
  return new Promise((resolve, reject) => {
    const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
    
    deleteRequest.onsuccess = async () => {
      console.log('Base de datos eliminada correctamente');
      try {
        await initDB();
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    
    deleteRequest.onerror = () => {
      reject(new Error('Error al eliminar la base de datos'));
    };
  });
};

export const addToIndexedDB = async (product) => {
  try {
    console.log('Agregando a IndexedDB:', product);
    const store = await getStore(STORES.PRODUCTS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(product);
      request.onsuccess = () => {
        console.log('Producto agregado exitosamente a IndexedDB:', product.id);
        resolve(request.result);
      };
      request.onerror = () => {
        console.error('Error al agregar producto a IndexedDB:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error en addToIndexedDB:', error);
    throw error;
  }
};

export const updateInIndexedDB = async (product) => {
  try {
    console.log('Actualizando en IndexedDB:', product);
    const store = await getStore(STORES.PRODUCTS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(product);
      request.onsuccess = () => {
        console.log('Producto actualizado exitosamente en IndexedDB:', product.id);
        resolve(request.result);
      };
      request.onerror = () => {
        console.error('Error al actualizar producto en IndexedDB:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error en updateInIndexedDB:', error);
    throw error;
  }
};

export const deleteFromIndexedDB = async (productId) => {
  try {
    console.log('Eliminando de IndexedDB:', productId);
    const store = await getStore(STORES.PRODUCTS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(productId);
      request.onsuccess = () => {
        console.log('Producto eliminado exitosamente de IndexedDB:', productId);
        resolve(request.result);
      };
      request.onerror = () => {
        console.error('Error al eliminar producto de IndexedDB:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error en deleteFromIndexedDB:', error);
    throw error;
  }
};

export const getAllFromIndexedDB = async () => {
  try {
    console.log('Obteniendo todos los productos de IndexedDB');
    const store = await getStore(STORES.PRODUCTS, 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        console.log('Productos obtenidos exitosamente de IndexedDB:', request.result.length);
        resolve(request.result);
      };
      request.onerror = () => {
        console.error('Error al obtener productos de IndexedDB:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error en getAllFromIndexedDB:', error);
    throw error;
  }
};

export const clearIndexedDB = async () => {
  try {
    console.log('Limpiando IndexedDB');
    const store = await getStore(STORES.PRODUCTS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => {
        console.log('IndexedDB limpiada exitosamente');
        resolve();
      };
      request.onerror = () => {
        console.error('Error al limpiar IndexedDB:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error en clearIndexedDB:', error);
    throw error;
  }
};

// Función para guardar datos de autenticación
export const saveAuthData = async (authData) => {
  try {
    console.log('Guardando datos de autenticación en IndexedDB:', { ...authData, password: '***' });
    const store = await getStore(STORES.AUTH, 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.put(authData);
      request.onsuccess = () => {
        console.log('Datos de autenticación guardados exitosamente');
        resolve(request.result);
      };
      request.onerror = () => {
        console.error('Error al guardar datos de autenticación:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error en saveAuthData:', error);
    throw error;
  }
};

// Función para limpiar datos de autenticación
export const clearAuthData = async () => {
  try {
    console.log('Limpiando datos de autenticación');
    const store = await getStore(STORES.AUTH, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => {
        console.log('Datos de autenticación limpiados exitosamente');
        resolve();
      };
      request.onerror = () => {
        console.error('Error al limpiar datos de autenticación:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error en clearAuthData:', error);
    throw error;
  }
};

// Inicializar la base de datos al importar el módulo
console.log('Inicializando IndexedDB al cargar el módulo...');
initDB().catch(error => {
  console.error('Error al inicializar IndexedDB:', error);
});

export default {
  STORES,
  initDB,
  getDB
} 