// Exportar STORES como una constante
export const STORES = {
  PRODUCTS: 'products',
  AUTH: 'auth'
};

const DB_NAME = 'inventario-pwa';
const DB_VERSION = 3; // Incrementamos la versión para forzar la actualización

let db = null;

export const initDB = async () => {
  return new Promise((resolve, reject) => {
    // Primero, verificamos la versión actual
    const checkRequest = indexedDB.open(DB_NAME);
    
    checkRequest.onsuccess = (event) => {
      const existingDB = event.target.result;
      const currentVersion = existingDB.version;
      existingDB.close();

      console.log('Versión actual de IndexedDB:', currentVersion);
      const request = indexedDB.open(DB_NAME, Math.max(DB_VERSION, currentVersion));

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
        console.log('Actualizando estructura de IndexedDB a versión:', event.newVersion);
        const db = event.target.result;
        const oldVersion = event.oldVersion;

        // Si es una nueva base de datos (oldVersion es 0)
        if (oldVersion < 1) {
          console.log('Creando estructura inicial...');
          if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
            const productStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
            productStore.createIndex('name', 'name', { unique: false });
          }
        }

        // Actualizaciones para la versión 2
        if (oldVersion < 2) {
          console.log('Aplicando actualizaciones de la versión 2...');
          if (db.objectStoreNames.contains(STORES.PRODUCTS)) {
            const productStore = event.target.transaction.objectStore(STORES.PRODUCTS);
            if (!productStore.indexNames.contains('enabled')) {
              productStore.createIndex('enabled', 'enabled', { unique: false });
            }
          }
        }

        // Actualizaciones para la versión 3
        if (oldVersion < 3) {
          console.log('Aplicando actualizaciones de la versión 3...');
          // Eliminar y recrear el store AUTH con la configuración correcta
          if (db.objectStoreNames.contains(STORES.AUTH)) {
            db.deleteObjectStore(STORES.AUTH);
          }
          const authStore = db.createObjectStore(STORES.AUTH, { keyPath: 'email' });
          authStore.createIndex('email', 'email', { unique: true });
          authStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        console.log('Actualización de estructura completada');
      };
    };

    checkRequest.onerror = (event) => {
      console.error('Error al verificar la versión de IndexedDB:', event.target.error);
      reject(event.target.error);
    };
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

// Guardar datos de autenticación
export const saveAuthData = async (authData) => {
    try {
        console.log('Guardando datos de autenticación en IndexedDB:', { ...authData, password: '***' });
        const store = await getStore(STORES.AUTH, 'readwrite');
        
        // Limpiar datos anteriores
        await new Promise((resolve, reject) => {
            const clearRequest = store.clear();
            clearRequest.onsuccess = resolve;
            clearRequest.onerror = reject;
        });

        return new Promise((resolve, reject) => {
            const request = store.add(authData);
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

// Limpiar datos de autenticación
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
console.log('Inicializando IndexedDB al cargar el módulo...')
initDB().then(() => {
  console.log('IndexedDB inicializada exitosamente al cargar el módulo')
}).catch(error => {
  console.error('Error al inicializar IndexedDB:', error)
})

export default {
  STORES,
  initDB,
  getDB
} 