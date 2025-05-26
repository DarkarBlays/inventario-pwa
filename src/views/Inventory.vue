<template>
  <div class="min-h-screen bg-gray-100">
    <!-- Header -->
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <h1 class="text-3xl font-bold text-gray-900">Inventario de Productos</h1>
        <div class="flex items-center space-x-4">
          <span v-if="productStore.getPendingSync" class="text-yellow-600">
            Cambios pendientes de sincronizar
          </span>
          <span v-else class="text-green-600">
            Todos los cambios están sincronizados
          </span>
          <button
            @click="logout"
            class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <!-- Botón para agregar nuevo producto -->
      <div class="mb-6">
        <button
          @click="showAddModal = true"
          class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Agregar Producto
        </button>
      </div>

      <!-- Lista de productos -->
      <div class="bg-white shadow overflow-hidden sm:rounded-lg">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Imagen
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Descripción
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Precio
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="product in productStore.getProducts" :key="product.id">
              <td class="px-6 py-4 whitespace-nowrap">
                <img :src="product.image" alt="Producto" class="h-10 w-10 rounded-full" />
              </td>
              <td class="px-6 py-4 whitespace-nowrap">{{ product.name }}</td>
              <td class="px-6 py-4">{{ product.description }}</td>
              <td class="px-6 py-4 whitespace-nowrap">${{ product.price }}</td>
              <td class="px-6 py-4 whitespace-nowrap">{{ product.stock }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="product.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                  class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                >
                  {{ product.enabled ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  @click="editProduct(product)"
                  class="text-indigo-600 hover:text-indigo-900 mr-2"
                >
                  Editar
                </button>
                <button
                  @click="deleteProduct(product.id)"
                  class="text-red-600 hover:text-red-900"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <!-- Modal para agregar/editar producto -->
    <ProductModal
      v-if="showAddModal"
      :edit-mode="!!selectedProduct"
      :product="selectedProduct"
      @close="closeModal"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProductStore } from '../stores/productStore'
import { useAuthStore } from '../stores/auth.store'
import ProductModal from '../components/ProductModal.vue'

const router = useRouter()
const productStore = useProductStore()
const authStore = useAuthStore()
const showAddModal = ref(false)
const selectedProduct = ref(null)

onMounted(async () => {
  try {
    // Solo inicializar si no hay productos cargados
    if (productStore.getProducts.length === 0) {
      await productStore.initializeStore();
    }
  } catch (error) {
    console.error('Error al cargar productos:', error);
  }
})

const logout = () => {
  authStore.logout()
}

const editProduct = (product) => {
  selectedProduct.value = product
  showAddModal.value = true
}

const closeModal = () => {
  showAddModal.value = false
  selectedProduct.value = null
}

const deleteProduct = (productId) => {
  if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
    productStore.deleteProduct(productId)
  }
}

// Escuchar cambios en la conexión
window.addEventListener('online', () => {
  productStore.syncOfflineProducts()
})
</script> 