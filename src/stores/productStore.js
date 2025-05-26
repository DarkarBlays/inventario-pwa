import { defineStore } from 'pinia'
import {
  addToIndexedDB,
  updateInIndexedDB,
  deleteFromIndexedDB,
  getAllFromIndexedDB,
  clearIndexedDB,
  getDB,
  getStore,
  STORES
} from '../services/indexedDB'
import { api } from '../services/api'

export const useProductStore = defineStore('products', {
  state: () => ({
    products: [],
    syncStatus: 'synced', // 'synced', 'pending'
    offlineProducts: [], // Productos pendientes de sincronizar
    error: null,
    loading: false,
    lastSync: null,
    isOnline: navigator.onLine
  }),

  actions: {
    async initializeStore() {
      try {
        this.loading = true;
        this.error = null;
        console.log('Inicializando store de productos...');

        // Configurar listeners para el estado de conexión
        window.addEventListener('online', this.handleConnectionChange);
        window.addEventListener('offline', this.handleConnectionChange);

        // Cargar productos desde IndexedDB primero
        await this.loadFromIndexedDB();

        // Si estamos online, intentar sincronizar con el backend
        if (this.isOnline) {
          await this.syncWithBackend();
        }
      } catch (error) {
        console.error('Error al inicializar store:', error);
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },

    handleConnectionChange() {
      const wasOffline = !this.isOnline;
      this.isOnline = navigator.onLine;
      console.log('Estado de conexión:', this.isOnline ? 'online' : 'offline');
      
      if (this.isOnline && wasOffline) {
        console.log('Conexión recuperada, verificando productos pendientes...');
        if (this.offlineProducts.length > 0) {
          console.log(`Encontrados ${this.offlineProducts.length} productos pendientes de sincronizar`);
          this.syncOfflineProducts();
        } else {
          console.log('No hay productos pendientes de sincronizar');
        }
      }
    },

    async loadFromIndexedDB() {
      try {
        const products = await getAllFromIndexedDB();
        this.products = products;
        return products;
      } catch (error) {
        console.error('Error cargando productos desde IndexedDB:', error);
        throw error;
      }
    },

    async syncWithBackend() {
      if (!navigator.onLine) return;

      try {
        const response = await api.get('/productos');
        if (!response || !Array.isArray(response)) {
          throw new Error('Respuesta inválida del servidor');
        }
        
        // Normalizar los productos del servidor
        const normalizedProducts = response.map(product => ({
          id: product.id,
          name: product.nombre || '',
          description: product.descripcion || '',
          price: Number(product.precio) || 0,
          stock: Number(product.stock) || 0,
          image: product.imagen || '',
          enabled: product.activo !== undefined ? product.activo : true,
          syncStatus: product.estado_sincronizacion || 'synced',
          timestamp: new Date().toISOString()
        }));

        // Actualizar IndexedDB solo si hay cambios
        const currentProducts = await getAllFromIndexedDB();
        const hasChanges = this.hasProductChanges(currentProducts, normalizedProducts);
        
        if (hasChanges) {
          await clearIndexedDB();
          for (const product of normalizedProducts) {
            await addToIndexedDB(product);
          }
        }
        
        this.products = normalizedProducts;
        this.lastSync = new Date().toISOString();
        this.syncStatus = 'synced';
      } catch (error) {
        console.error('Error sincronizando con backend:', error);
        throw error;
      }
    },

    hasProductChanges(currentProducts, newProducts) {
      if (currentProducts.length !== newProducts.length) return true;
      
      const compareProducts = (a, b) => {
        return a.id === b.id &&
               a.name === b.name &&
               a.description === b.description &&
               a.price === b.price &&
               a.stock === b.stock &&
               a.enabled === b.enabled;
      };

      return !currentProducts.every(current => 
        newProducts.some(newProd => compareProducts(current, newProd))
      );
    },

    isTemporaryId(id) {
      if (!id) return true;
      const idStr = id.toString();
      return idStr.startsWith('temp_') || idStr.length > 10;
    },

    async compressImage(base64String) {
      if (!base64String || !base64String.startsWith('data:image')) {
        return base64String;
      }

      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calcular nuevas dimensiones manteniendo el aspect ratio
          const maxSize = 800;
          if (width > height && width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          } else if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Comprimir como JPEG con calidad 0.7
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = base64String;
      });
    },

    generateTempId() {
      return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    async verifyTempId(tempId) {
      try {
        const store = await getStore(STORES.PRODUCTS, 'readonly');
        return new Promise((resolve, reject) => {
          const request = store.get(tempId);
          request.onsuccess = () => {
            console.log('Verificación de ID temporal:', tempId, request.result ? 'existe' : 'no existe');
            resolve(request.result);
          };
          request.onerror = () => {
            console.error('Error al verificar ID temporal:', request.error);
            reject(request.error);
          };
        });
      } catch (error) {
        console.error('Error verificando ID temporal:', error);
        return null;
      }
    },

    async addProduct(product) {
      try {
        // Normalizar el producto para el backend
        const backendProduct = {
          nombre: product.nombre || product.name || '',
          descripcion: product.descripcion || product.description || '',
          precio: Number(product.precio || product.price) || 0,
          stock: Number(product.stock) || 0,
          imagen: product.imagen || product.image || '',
          activo: product.activo !== undefined ? product.activo : true
        };

        if (!navigator.onLine) {
          console.log('Modo offline: Guardando producto localmente');
          
          // Crear un ID temporal único
          const tempId = this.generateTempId();
          console.log('ID temporal generado:', tempId);
          
          // Verificar que el ID temporal no exista ya
          const existingProduct = await this.verifyTempId(tempId);
          
          if (existingProduct) {
            console.log('ID temporal ya existe, generando uno nuevo');
            return this.addProduct(product); // Reintentar con un nuevo ID
          }
          
          // Crear producto offline
          const offlineProduct = {
            id: tempId,
            name: backendProduct.nombre,
            description: backendProduct.descripcion,
            price: backendProduct.precio,
            stock: backendProduct.stock,
            image: backendProduct.imagen,
            enabled: backendProduct.activo,
            syncStatus: 'pending',
            timestamp: new Date().toISOString()
          };
          
          console.log('Guardando producto offline:', offlineProduct);
          
          // Guardar en IndexedDB
          await addToIndexedDB(offlineProduct);
          
          // Agregar a la lista de productos
          this.products.push(offlineProduct);
          
          // Agregar a la cola de sincronización
          this.offlineProducts.push({
            ...offlineProduct,
            action: 'add'
          });
          
          this.syncStatus = 'pending';
          return offlineProduct;
        }

        // Si estamos online, enviar al backend
        console.log('Modo online: Enviando producto al servidor');
        const response = await api.post('/productos', backendProduct);
        
        if (!response || !response.producto) {
          throw new Error('Error al crear el producto en el servidor');
        }

        // Normalizar la respuesta del servidor
        const serverProduct = {
          id: response.producto.id,
          name: response.producto.nombre,
          description: response.producto.descripcion,
          price: Number(response.producto.precio),
          stock: Number(response.producto.stock),
          image: response.producto.imagen,
          enabled: response.producto.activo,
          syncStatus: 'synced',
          timestamp: new Date().toISOString()
        };

        // Guardar en IndexedDB y actualizar el store
        await addToIndexedDB(serverProduct);
        this.products.push(serverProduct);
        this.syncStatus = 'synced';
        return serverProduct;
      } catch (error) {
        console.error('Error en addProduct:', error);
        this.error = error.message;
        throw error;
      }
    },

    async retrySync(product) {
      if (!this.isOnline) return;
      
      try {
        console.log('Reintentando sincronización...');
        const backendProduct = {
          nombre: product.name,
          descripcion: product.description,
          precio: product.price,
          stock: product.stock,
          imagen: product.image,
          activo: product.enabled
        };

        const response = await api.post('/productos', backendProduct);
        if (response && response.data) {
          const index = this.offlineProducts.findIndex(p => p.id === product.id);
          if (index !== -1) {
            this.offlineProducts.splice(index, 1);
          }
          if (this.offlineProducts.length === 0) {
            this.syncStatus = 'synced';
          }
        }
      } catch (error) {
        console.error('Error en reintento de sincronización:', error);
      }
    },

    async updateProduct(product) {
      try {
        this.loading = true;
        console.log('Actualizando producto:', product);

        // Comprimir imagen si existe
        if (product.imagen || product.image) {
          const compressedImage = await this.compressImage(product.imagen || product.image);
          product.imagen = compressedImage;
          product.image = compressedImage;
        }

        // Verificar si es un ID temporal o no sincronizado
        const needsCreation = this.isTemporaryId(product.id);
        console.log('¿Necesita creación?:', needsCreation, 'ID:', product.id);

        if (this.isOnline) {
          // Convertir a formato del backend
          const backendProduct = {
            nombre: product.nombre || product.name || '',
            descripcion: product.descripcion || product.description || '',
            precio: Number(product.precio || product.price) || 0,
            stock: Number(product.stock) || 0,
            activo: typeof product.activo !== 'undefined' ? product.activo : 
                    typeof product.enabled !== 'undefined' ? product.enabled : true,
            imagen: product.imagen || product.image || ''
          };

          let response;
          
          if (needsCreation) {
            // Si necesita creación, crear un nuevo producto
            console.log('Creando nuevo producto para ID:', product.id);
            response = await api.post('/productos', backendProduct);
          } else {
            // Si no necesita creación, actualizar normalmente
            console.log('Actualizando producto existente:', product.id);
            response = await api.put(`/productos/${product.id}`, backendProduct);
          }

          if (!response || !response.producto) {
            throw new Error('Error al actualizar el producto');
          }

          // Convertir la respuesta del servidor al formato local
          const updatedProduct = {
            id: response.producto.id,
            name: response.producto.nombre,
            description: response.producto.descripcion,
            price: Number(response.producto.precio),
            stock: Number(response.producto.stock),
            image: response.producto.imagen,
            enabled: response.producto.activo,
            syncStatus: response.producto.estado_sincronizacion || 'synced',
            timestamp: new Date().toISOString()
          };

          // Si era un producto temporal, eliminar el antiguo
          if (needsCreation) {
            await deleteFromIndexedDB(product.id);
            const index = this.products.findIndex(p => p.id === product.id);
            if (index !== -1) {
              this.products.splice(index, 1);
            }
          }

          // Actualizar IndexedDB y store
          await updateInIndexedDB(updatedProduct);
          const index = this.products.findIndex(p => p.id === updatedProduct.id);
          if (index !== -1) {
            this.products[index] = updatedProduct;
          } else {
            this.products.push(updatedProduct);
          }

          this.syncStatus = 'synced';
          return updatedProduct;
        } else {
          // Modo offline
          const offlineProduct = {
            id: product.id,
            name: product.nombre || product.name || '',
            description: product.descripcion || product.description || '',
            price: Number(product.precio || product.price) || 0,
            stock: Number(product.stock) || 0,
            image: product.imagen || product.image || '',
            enabled: typeof product.activo !== 'undefined' ? product.activo : 
                     typeof product.enabled !== 'undefined' ? product.enabled : true,
            syncStatus: 'pending',
            timestamp: new Date().toISOString()
          };

          await updateInIndexedDB(offlineProduct);
          const index = this.products.findIndex(p => p.id === offlineProduct.id);
          if (index !== -1) {
            this.products[index] = offlineProduct;
          }
          this.offlineProducts.push({ ...offlineProduct, action: 'update' });
          this.syncStatus = 'pending';
          return offlineProduct;
        }
      } catch (error) {
        console.error('Error al actualizar producto:', error);
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteProduct(productId) {
      try {
        this.loading = true;

        // Eliminar de IndexedDB primero
        await deleteFromIndexedDB(productId);
        this.products = this.products.filter(p => p.id !== productId);

        if (navigator.onLine) {
          try {
            await api.delete(`/productos/${productId}`);
            this.syncStatus = 'synced';
          } catch (error) {
            console.error('Error al eliminar en el backend:', error);
            this.offlineProducts.push({ id: productId, action: 'delete' });
            this.syncStatus = 'pending';
          }
        } else {
          this.offlineProducts.push({ id: productId, action: 'delete' });
          this.syncStatus = 'pending';
        }
      } catch (error) {
        console.error('Error al eliminar producto:', error);
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },

    async syncOfflineProducts() {
      if (!this.isOnline || this.offlineProducts.length === 0) return;

      console.log('Iniciando sincronización de productos offline:', this.offlineProducts);
      
      // Crear una copia de los productos a sincronizar
      const productsToSync = [...this.offlineProducts];
      // Limpiar la cola de productos offline antes de empezar
      this.offlineProducts = [];
      
      for (const product of productsToSync) {
        try {
          console.log('Sincronizando producto:', product);

          // Convertir al formato del backend
          const backendProduct = {
            nombre: product.name,
            descripcion: product.description,
            precio: Number(product.price),
            stock: Number(product.stock),
            imagen: product.image,
            activo: product.enabled
          };

          let response;
          
          switch (product.action) {
            case 'add':
              console.log('Creando producto en el servidor:', backendProduct);
              response = await api.post('/productos', backendProduct);
              if (response && response.producto) {
                // Primero eliminar el producto temporal de IndexedDB y del store
                console.log('Eliminando producto temporal:', product.id);
                await deleteFromIndexedDB(product.id);
                this.products = this.products.filter(p => p.id !== product.id);
                
                // Luego agregar el nuevo producto con ID del servidor
                const serverProduct = {
                  id: response.producto.id,
                  name: response.producto.nombre,
                  description: response.producto.descripcion,
                  price: Number(response.producto.precio),
                  stock: Number(response.producto.stock),
                  image: response.producto.imagen,
                  enabled: response.producto.activo,
                  syncStatus: 'synced',
                  timestamp: new Date().toISOString()
                };
                
                console.log('Agregando producto sincronizado:', serverProduct);
                await addToIndexedDB(serverProduct);
                this.products.push(serverProduct);
                console.log('Producto sincronizado exitosamente:', product.id);
              }
              break;

            case 'update':
              console.log('Actualizando producto en el servidor:', product.id, backendProduct);
              response = await api.put(`/productos/${product.id}`, backendProduct);
              if (response && response.producto) {
                const updatedProduct = {
                  id: response.producto.id,
                  name: response.producto.nombre,
                  description: response.producto.descripcion,
                  price: Number(response.producto.precio),
                  stock: Number(response.producto.stock),
                  image: response.producto.imagen,
                  enabled: response.producto.activo,
                  syncStatus: 'synced',
                  timestamp: new Date().toISOString()
                };
                
                await updateInIndexedDB(updatedProduct);
                const index = this.products.findIndex(p => p.id === updatedProduct.id);
                if (index !== -1) {
                  this.products[index] = updatedProduct;
                }
              }
              break;

            case 'delete':
              console.log('Eliminando producto en el servidor:', product.id);
              await api.delete(`/productos/${product.id}`);
              await deleteFromIndexedDB(product.id);
              this.products = this.products.filter(p => p.id !== product.id);
              break;
          }
          
        } catch (error) {
          console.error(`Error sincronizando producto ${product.id}:`, error);
          // Si hay un error, volver a agregar el producto a la cola offline
          this.offlineProducts.push(product);
        }
      }

      // Actualizar estado de sincronización
      if (this.offlineProducts.length === 0) {
        this.syncStatus = 'synced';
        console.log('Sincronización completada exitosamente');
        
        // Recargar todos los productos desde el servidor
        try {
          const response = await api.get('/productos');
          if (response && Array.isArray(response)) {
            // Limpiar IndexedDB
            await clearIndexedDB();
            
            // Actualizar con los datos del servidor
            const serverProducts = response.map(producto => ({
              id: producto.id,
              name: producto.nombre,
              description: producto.descripcion,
              price: Number(producto.precio),
              stock: Number(producto.stock),
              image: producto.imagen,
              enabled: producto.activo,
              syncStatus: 'synced',
              timestamp: new Date().toISOString()
            }));
            
            // Actualizar IndexedDB y store
            for (const product of serverProducts) {
              await addToIndexedDB(product);
            }
            this.products = serverProducts;
          }
        } catch (error) {
          console.error('Error al recargar productos del servidor:', error);
        }
      } else {
        this.syncStatus = 'pending';
        console.log('Quedan productos pendientes de sincronizar:', this.offlineProducts);
      }
    }
  },

  getters: {
    getProducts: (state) => state.products,
    getSyncStatus: (state) => state.syncStatus,
    getPendingSync: (state) => state.offlineProducts.length > 0,
    isLoading: (state) => state.loading,
    getError: (state) => state.error,
    getLastSync: (state) => state.lastSync,
    getConnectionStatus: (state) => state.isOnline
  }
}); 