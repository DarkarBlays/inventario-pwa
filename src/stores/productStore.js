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
    lastSync: null
  }),

  actions: {
    async initializeStore() {
      try {
        this.loading = true;
        this.error = null;
        console.log('Inicializando store de productos...');
        
        // Cargar productos desde IndexedDB primero
        await this.loadFromIndexedDB();
        
        // Si estamos online, intentar sincronizar con el backend
        if (navigator.onLine) {
          await this.syncWithBackend();
        }
      } catch (error) {
        console.error('Error al inicializar store:', error);
        this.error = error.message;
      } finally {
        this.loading = false;
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
          // Guardar productos del backend en IndexedDB
          for (const product of response.data) {
            await addToIndexedDB({
              id: product.id,
              name: product.nombre || '',
              description: product.descripcion || '',
              price: product.precio || 0,
              stock: product.stock || 0,
              image: product.imagen || '',
              enabled: product.activo ?? true
            });
          }
          
          // Actualizar el store
          await this.loadFromIndexedDB();
        }
        
        this.lastSync = new Date().toISOString();
        this.syncStatus = 'synced';
      } catch (error) {
        console.error('Error al sincronizar con el backend:', error);
        this.syncStatus = 'pending';
        // Si hay error, mantener los datos locales
        await this.loadFromIndexedDB();
      }
    },

    async addProduct(product) {
      try {
        this.loading = true;
        console.log('Agregando nuevo producto:', product);

        const newProduct = {
          id: Date.now().toString(),
          name: product.nombre || '',
          description: product.descripcion || '',
          price: product.precio || 0,
          stock: product.stock || 0,
          image: product.imagen || '',
          enabled: product.activo ?? true
        };

        // Guardar en IndexedDB primero
        await addToIndexedDB(newProduct);
        this.products.push(newProduct);

        if (navigator.onLine) {
          try {
            const response = await apiService.post('/productos', {
              nombre: newProduct.name,
              descripcion: newProduct.description,
              precio: newProduct.price,
              stock: newProduct.stock,
              imagen: newProduct.image,
              activo: newProduct.enabled
            });
            
            if (response.data) {
              // Actualizar el ID con el del backend
              await updateInIndexedDB({ ...newProduct, id: response.data.id });
              const index = this.products.findIndex(p => p.id === newProduct.id);
              if (index !== -1) {
                this.products[index] = { ...newProduct, id: response.data.id };
              }
            }
            this.syncStatus = 'synced';
          } catch (error) {
            console.error('Error al guardar en el backend:', error);
            this.offlineProducts.push({ ...newProduct, action: 'add' });
            this.syncStatus = 'pending';
          }
        } else {
          this.offlineProducts.push({ ...newProduct, action: 'add' });
          this.syncStatus = 'pending';
        }
      } catch (error) {
        console.error('Error al agregar producto:', error);
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },

    async updateProduct(product) {
      try {
        this.loading = true;
        
        // Actualizar en IndexedDB primero
        await updateInIndexedDB(product);
        const index = this.products.findIndex(p => p.id === product.id);
        if (index !== -1) {
          this.products[index] = product;
        }

        if (navigator.onLine) {
          try {
            await apiService.put(`/productos/${product.id}`, {
              nombre: product.name,
              descripcion: product.description,
              precio: product.price,
              stock: product.stock,
              imagen: product.image,
              activo: product.enabled
            });
            this.syncStatus = 'synced';
          } catch (error) {
            console.error('Error al actualizar en el backend:', error);
            this.offlineProducts.push({ ...product, action: 'update' });
            this.syncStatus = 'pending';
          }
        } else {
          this.offlineProducts.push({ ...product, action: 'update' });
          this.syncStatus = 'pending';
        }
      } catch (error) {
        console.error('Error al actualizar producto:', error);
        this.error = error.message;
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
    getLastSync: (state) => state.lastSync
  }
}); 