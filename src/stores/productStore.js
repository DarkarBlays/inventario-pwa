import { defineStore } from 'pinia'
import {
  addToIndexedDB,
  updateInIndexedDB,
  deleteFromIndexedDB,
  getAllFromIndexedDB,
  clearIndexedDB
} from '../services/indexedDB'
import { apiService } from '../services/api.service'

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
      this.isOnline = navigator.onLine;
      console.log('Estado de conexión:', this.isOnline ? 'online' : 'offline');
      
      if (this.isOnline && this.offlineProducts.length > 0) {
        console.log('Conexión restaurada, sincronizando productos pendientes...');
        this.syncOfflineProducts();
      }
    },

    async loadFromIndexedDB() {
      console.log('Cargando productos desde IndexedDB...');
      const localProducts = await getAllFromIndexedDB();
      console.log('Productos en IndexedDB:', localProducts);

      this.products = localProducts.map(product => ({
        id: product.id,
        name: product.name || product.nombre || '',
        description: product.description || product.descripcion || '',
        price: product.price || product.precio || 0,
        stock: product.stock || 0,
        image: product.image || product.imagen || '',
        enabled: typeof product.enabled !== 'undefined' ? product.enabled :
          typeof product.activo !== 'undefined' ? product.activo : true
      }));
    },

    async syncWithBackend() {
      try {
        console.log('Sincronizando con el backend...');
        const response = await apiService.get('/productos');

        if (response.data && Array.isArray(response.data)) {
          // Obtener productos actuales de IndexedDB
          const localProducts = await getAllFromIndexedDB();
          const localProductsMap = new Map(localProducts.map(p => [p.id, p]));
          const backendIds = new Set();

          console.log('Procesando productos del backend...');
          
          // Procesar productos del backend
          for (const product of response.data) {
            backendIds.add(product.id);
            const normalizedProduct = {
              id: product.id,
              name: product.nombre || '',
              description: product.descripcion || '',
              price: Number(product.precio) || 0,
              stock: Number(product.stock) || 0,
              image: product.imagen || '',
              enabled: product.activo ?? true
            };

            const localProduct = localProductsMap.get(product.id);
            
            // Si el producto local tiene cambios pendientes, no lo sobrescribimos
            if (localProduct && this.offlineProducts.some(p => p.id === product.id)) {
              console.log(`Producto ${product.id} tiene cambios pendientes, manteniendo versión local`);
              continue;
            }

            // Actualizar o agregar el producto
            await addToIndexedDB(normalizedProduct);
          }

          // Mantener productos locales que no existen en el backend
          // (pueden ser productos nuevos creados offline)
          for (const localProduct of localProducts) {
            if (!backendIds.has(localProduct.id) && !localProduct.id.toString().startsWith('temp_')) {
              console.log(`Eliminando producto local ${localProduct.id} que ya no existe en el backend`);
              await deleteFromIndexedDB(localProduct.id);
            }
          }

          // Actualizar el store
          await this.loadFromIndexedDB();
          
          this.lastSync = new Date().toISOString();
          this.syncStatus = 'synced';
          
          console.log('Sincronización completada exitosamente');
        }
      } catch (error) {
        console.error('Error al sincronizar con el backend:', error);
        this.syncStatus = 'pending';
        // Si hay error, mantener los datos locales
        await this.loadFromIndexedDB();
      }
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

    async addProduct(product) {
      try {
        this.loading = true;
        console.log('Agregando nuevo producto:', product);

        // Comprimir imagen si existe
        if (product.imagen) {
          product.imagen = await this.compressImage(product.imagen);
        }

        if (this.isOnline) {
          try {
            // Convertir a formato del backend
            const backendProduct = {
              nombre: product.nombre || '',
              descripcion: product.descripcion || '',
              precio: Number(product.precio) || 0,
              stock: Number(product.stock) || 0,
              imagen: product.imagen || '',
              activo: product.activo ?? true
            };

            console.log('Intentando guardar en el backend...');
            const response = await apiService.post('/productos', backendProduct);

            if (response && response.data && response.data.producto) {
              console.log('Producto guardado en el backend:', response.data);
              // Crear producto con el ID del backend
              const newProduct = {
                id: response.data.producto.id,
                name: response.data.producto.nombre,
                description: response.data.producto.descripcion,
                price: response.data.producto.precio,
                stock: response.data.producto.stock,
                image: response.data.producto.imagen || '',
                enabled: response.data.producto.activo
              };
              
              // Guardar en IndexedDB y actualizar el store
              await addToIndexedDB(newProduct);
              this.products.push(newProduct);
              this.syncStatus = 'synced';
              return newProduct;
            } else {
              throw new Error('Respuesta inválida del servidor');
            }
          } catch (error) {
            console.error('Error al guardar en el backend:', error);
            throw error;
          }
        } else {
          // Modo offline: usar ID temporal
          const newProduct = {
            id: `temp_${Date.now()}`,
            name: product.nombre || '',
            description: product.descripcion || '',
            price: Number(product.precio) || 0,
            stock: Number(product.stock) || 0,
            image: product.imagen || '',
            enabled: product.activo ?? true,
            pendingSync: true
          };

          await addToIndexedDB(newProduct);
          this.products.push(newProduct);
          this.offlineProducts.push({ ...newProduct, action: 'add' });
          this.syncStatus = 'pending';
          return newProduct;
        }
      } catch (error) {
        console.error('Error al agregar producto:', error);
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
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

        const response = await apiService.post('/productos', backendProduct);
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

          let updatedProduct;
          
          if (needsCreation) {
            // Si necesita creación, crear un nuevo producto
            console.log('Creando nuevo producto para ID:', product.id);
            const response = await apiService.post('/productos', backendProduct);
            
            if (response && response.data) {
              const serverProduct = response.data.producto || response.data;
              updatedProduct = {
                id: serverProduct.id || response.data.id,
                name: backendProduct.nombre,
                description: backendProduct.descripcion,
                price: backendProduct.precio,
                stock: backendProduct.stock,
                image: backendProduct.imagen || '',
                enabled: backendProduct.activo,
                pendingSync: false
              };
              
              // Eliminar el producto temporal
              await deleteFromIndexedDB(product.id);
              const index = this.products.findIndex(p => p.id === product.id);
              if (index !== -1) {
                this.products.splice(index, 1);
              }
            } else {
              throw new Error('Error al crear el producto en el servidor');
            }
          } else {
            // Si no necesita creación, actualizar normalmente
            console.log('Actualizando producto existente:', product.id);
            const response = await apiService.put(`/productos/${product.id}`, backendProduct);
            
            if (response && response.data) {
              updatedProduct = {
                id: product.id,
                name: backendProduct.nombre,
                description: backendProduct.descripcion,
                price: backendProduct.precio,
                stock: backendProduct.stock,
                image: backendProduct.imagen,
                enabled: backendProduct.activo,
                pendingSync: false
              };
            } else {
              throw new Error('Error al actualizar el producto');
            }
          }

          // Actualizar IndexedDB y store
          await updateInIndexedDB(updatedProduct);
          const index = this.products.findIndex(p => p.id === (needsCreation ? product.id : updatedProduct.id));
          if (index !== -1) {
            this.products[index] = updatedProduct;
          } else {
            this.products.push(updatedProduct);
          }
          this.syncStatus = 'synced';
          return updatedProduct;
        } else {
          // Modo offline
          const normalizedProduct = {
            id: product.id,
            name: product.nombre || product.name || '',
            description: product.descripcion || product.description || '',
            price: Number(product.precio || product.price) || 0,
            stock: Number(product.stock) || 0,
            image: product.imagen || product.image || '',
            enabled: typeof product.activo !== 'undefined' ? product.activo : 
                     typeof product.enabled !== 'undefined' ? product.enabled : true,
            pendingSync: true
          };

          await updateInIndexedDB(normalizedProduct);
          const index = this.products.findIndex(p => p.id === normalizedProduct.id);
          if (index !== -1) {
            this.products[index] = normalizedProduct;
          }
          this.offlineProducts.push({ ...normalizedProduct, action: 'update' });
          this.syncStatus = 'pending';
          return normalizedProduct;
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
            await apiService.delete(`/productos/${productId}`);
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
      if (!navigator.onLine || this.offlineProducts.length === 0) return;

      try {
        this.loading = true;
        console.log('Sincronizando productos offline:', this.offlineProducts);

        for (const product of this.offlineProducts) {
          try {
            switch (product.action) {
              case 'add':
                await apiService.post('/productos', {
                  nombre: product.name,
                  descripcion: product.description,
                  precio: product.price,
                  stock: product.stock,
                  imagen: product.image,
                  activo: product.enabled
                });
                break;
              case 'update':
                await apiService.put(`/productos/${product.id}`, {
                  nombre: product.name,
                  descripcion: product.description,
                  precio: product.price,
                  stock: product.stock,
                  imagen: product.image,
                  activo: product.enabled
                });
                break;
              case 'delete':
                await apiService.delete(`/productos/${product.id}`);
                break;
            }
          } catch (error) {
            console.error(`Error al sincronizar operación ${product.action}:`, error);
          }
        }

        // Limpiar cola de operaciones pendientes
        this.offlineProducts = [];
        this.syncStatus = 'synced';

        // Actualizar datos desde el backend
        await this.syncWithBackend();
      } catch (error) {
        console.error('Error al sincronizar productos:', error);
        this.error = error.message;
      } finally {
        this.loading = false;
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