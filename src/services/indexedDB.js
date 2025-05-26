const DB_NAME = 'inventario-pwa'
const DB_VERSION = 2
const STORES = {
  PRODUCTS: 'productos',
  AUTH: 'auth'
}

let db = null
let initPromise = null

export const initDB = () => {
  if (initPromise) return initPromise

  initPromise = new Promise((resolve, reject) => {
    try {
      console.log('Iniciando IndexedDB...')
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = (event) => {
        console.error('Error al abrir IndexedDB:', event.target.error)
        reject(event.target.error)
        initPromise = null
      }

      request.onsuccess = (event) => {
        db = event.target.result
        console.log('IndexedDB inicializada correctamente')
        
        // Verificar que los stores existan
        const storeNames = Array.from(db.objectStoreNames)
        console.log('Stores disponibles:', storeNames)
        
        resolve(db)
      }

      request.onupgradeneeded = (event) => {
        console.log('Actualizando estructura de IndexedDB...')
        const database = event.target.result

        // Crear o verificar store de productos
        if (!database.objectStoreNames.contains(STORES.PRODUCTS)) {
          console.log('Creando store de productos...')
          const productStore = database.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' })
          productStore.createIndex('name', 'name', { unique: false })
          productStore.createIndex('enabled', 'enabled', { unique: false })
          console.log('Store de productos creado')
        }

        // Crear o verificar store de autenticación
        if (!database.objectStoreNames.contains(STORES.AUTH)) {
          console.log('Creando store de autenticación...')
          database.createObjectStore(STORES.AUTH, { keyPath: 'id' })
          console.log('Store de autenticación creado')
        }

        // Verificar que los stores se crearon correctamente
        const storeNames = Array.from(database.objectStoreNames)
        console.log('Stores creados:', storeNames)
      }
    } catch (error) {
      console.error('Error al inicializar IndexedDB:', error)
      reject(error)
      initPromise = null
    }
  })

  return initPromise
}

const ensureStoreExists = async (storeName) => {
  if (!db) {
    await initDB()
  }

  if (!db.objectStoreNames.contains(storeName)) {
    throw new Error(`Store '${storeName}' no encontrado. Stores disponibles: ${Array.from(db.objectStoreNames).join(', ')}`)
  }
}

const getStore = async (storeName, mode = 'readonly') => {
  await ensureStoreExists(storeName)
  const transaction = db.transaction([storeName], mode)
  return transaction.objectStore(storeName)
}

export const addToIndexedDB = async (product) => {
  try {
    const store = await getStore(STORES.PRODUCTS, 'readwrite')
    return new Promise((resolve, reject) => {
      const request = store.put(product)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Error en addToIndexedDB:', error)
    throw error
  }
}

export const updateInIndexedDB = async (product) => {
  try {
    const store = await getStore(STORES.PRODUCTS, 'readwrite')
    return new Promise((resolve, reject) => {
      const request = store.put(product)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Error en updateInIndexedDB:', error)
    throw error
  }
}

export const deleteFromIndexedDB = async (productId) => {
  try {
    const store = await getStore(STORES.PRODUCTS, 'readwrite')
    return new Promise((resolve, reject) => {
      const request = store.delete(productId)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Error en deleteFromIndexedDB:', error)
    throw error
  }
}

export const getAllFromIndexedDB = async () => {
  try {
    const store = await getStore(STORES.PRODUCTS, 'readonly')
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Error en getAllFromIndexedDB:', error)
    throw error
  }
}

export const clearIndexedDB = async () => {
  try {
    console.log('Limpiando IndexedDB...')
    // Limpiar todos los stores
    for (const storeName of Object.values(STORES)) {
      console.log(`Limpiando store: ${storeName}`)
      const store = await getStore(storeName, 'readwrite')
      await new Promise((resolve, reject) => {
        const request = store.clear()
        request.onsuccess = () => {
          console.log(`Store ${storeName} limpiado correctamente`)
          resolve()
        }
        request.onerror = () => reject(request.error)
      })
    }
    console.log('IndexedDB limpiada correctamente')
  } catch (error) {
    console.error('Error en clearIndexedDB:', error)
    throw error
  }
}

// Funciones para el manejo de autenticación en IndexedDB
export const saveAuthData = async (authData) => {
  try {
    console.log('Guardando datos de autenticación...')
    const store = await getStore(STORES.AUTH, 'readwrite')
    return new Promise((resolve, reject) => {
      const request = store.put({ id: 'current-auth', ...authData })
      request.onsuccess = () => {
        console.log('Datos de autenticación guardados correctamente')
        resolve(request.result)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Error en saveAuthData:', error)
    throw error
  }
}

export const getAuthData = async () => {
  try {
    const store = await getStore(STORES.AUTH, 'readonly')
    return new Promise((resolve, reject) => {
      const request = store.get('current-auth')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Error en getAuthData:', error)
    throw error
  }
}

export const clearAuthData = async () => {
  try {
    console.log('Limpiando datos de autenticación...')
    const store = await getStore(STORES.AUTH, 'readwrite')
    return new Promise((resolve, reject) => {
      const request = store.delete('current-auth')
      request.onsuccess = () => {
        console.log('Datos de autenticación limpiados correctamente')
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Error en clearAuthData:', error)
    throw error
  }
}

// Inicializar la base de datos al importar el módulo
console.log('Inicializando IndexedDB al cargar el módulo...')
initDB().then(() => {
  console.log('IndexedDB inicializada exitosamente al cargar el módulo')
}).catch(error => {
  console.error('Error al inicializar IndexedDB:', error)
}) 