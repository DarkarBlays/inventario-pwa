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
      <div class="mb-6 md:text-left text-center">
        <button
          @click="showAddModal = true"
          class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Agregar Producto
        </button>
      </div>

      <!-- Lista de productos -->
      <div class="bg-white shadow overflow-hidden sm:rounded-lg">
        <!-- Vista de tabla para pantallas grandes -->
        <div class="hidden md:block">
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

        <!-- Vista de tarjetas para móviles -->
        <div class="md:hidden">
          <div v-for="product in productStore.getProducts" :key="product.id" class="p-4 border-b border-gray-200">
            <div class="flex items-center space-x-4">
              <img :src="product.image" alt="Producto" class="h-16 w-16 rounded-lg object-cover" />
              <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start">
                  <h3 class="text-lg font-medium text-gray-900 truncate">{{ product.name }}</h3>
                  <span
                    :class="product.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                    class="px-2 py-1 text-xs font-semibold rounded-full"
                  >
                    {{ product.enabled ? 'Activo' : 'Inactivo' }}
                  </span>
                </div>
                <p class="mt-1 text-sm text-gray-500">{{ product.description }}</p>
                <div class="mt-2 flex items-center justify-between">
                  <div class="flex space-x-4">
                    <p class="text-sm font-medium text-gray-900">${{ product.price }}</p>
                    <p class="text-sm text-gray-500">Stock: {{ product.stock }}</p>
                  </div>
                  <div class="flex space-x-2">
                    <button
                      @click="editProduct(product)"
                      class="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
                    >
                      Editar
                    </button>
                    <button
                      @click="deleteProduct(product.id)"
                      class="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-red-600 bg-red-100 hover:bg-red-200"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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

<style scoped>
/* Estilos para el botón de instalar en pantallas pequeñas */
@media (max-width: 768px) {
  :deep(.install-button) {
    position: fixed !important;
    bottom: 1rem !important;
    right: 1rem !important;
    width: 3rem !important;
    height: 3rem !important;
    border-radius: 9999px !important;
    padding: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
  }

  :deep(.install-button span) {
    display: none !important;
  }

  :deep(.install-button::before) {
    content: "⬇️" !important;
    font-size: 1.5rem !important;
  }
}
</style> 