<template>
  <div class="fixed z-10 inset-0 overflow-y-auto">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 transition-opacity" aria-hidden="true">
        <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
      </div>

      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <form @submit.prevent="handleSubmit">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div v-if="productStore.getError" class="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              {{ productStore.getError }}
            </div>

            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2" for="name">
                Nombre
              </label>
              <input
                id="name"
                v-model="formData.nombre"
                type="text"
                required
                class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                :disabled="productStore.isLoading"
              />
            </div>

            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2" for="description">
                Descripción
              </label>
              <textarea
                id="description"
                v-model="formData.descripcion"
                class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                :disabled="productStore.isLoading"
              ></textarea>
            </div>

            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2" for="price">
                Precio
              </label>
              <input
                id="price"
                v-model.number="formData.precio"
                type="number"
                step="0.01"
                required
                class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                :disabled="productStore.isLoading"
              />
            </div>

            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2" for="stock">
                Stock
              </label>
              <input
                id="stock"
                v-model.number="formData.stock"
                type="number"
                required
                class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                :disabled="productStore.isLoading"
              />
            </div>

            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2" for="image">
                Imagen
              </label>
              <input
                id="image"
                type="file"
                accept="image/*"
                @change="handleImageChange"
                class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                :disabled="productStore.isLoading"
              />
            </div>

            <div class="mb-4">
              <label class="flex items-center">
                <input
                  type="checkbox"
                  v-model="formData.activo"
                  class="form-checkbox"
                  :disabled="productStore.isLoading"
                />
                <span class="ml-2">Activo</span>
              </label>
            </div>
          </div>

          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="submit"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
              :disabled="productStore.isLoading"
            >
              <template v-if="productStore.isLoading">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ editMode ? 'Actualizando...' : 'Creando...' }}
              </template>
              <template v-else>
                {{ editMode ? 'Actualizar' : 'Crear' }}
              </template>
            </button>
            <button
              type="button"
              @click="$emit('close')"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              :disabled="productStore.isLoading"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useProductStore } from '../stores/productStore'

const props = defineProps({
  product: {
    type: Object,
    default: () => ({})
  },
  editMode: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])
const productStore = useProductStore()

const formData = ref({
  nombre: '',
  descripcion: '',
  precio: 0,
  stock: 0,
  imagen: '',
  activo: true
})

// Función para inicializar el formulario con los datos del producto
const initializeFormData = (product) => {
  if (!product) return;
  
  console.log('Inicializando formulario con producto:', product);
  formData.value = {
    nombre: product.nombre || product.name || '',
    descripcion: product.descripcion || product.description || '',
    precio: product.precio || product.price || 0,
    stock: product.stock || 0,
    imagen: product.imagen || product.image || '',
    activo: typeof product.activo !== 'undefined' ? product.activo : 
           typeof product.enabled !== 'undefined' ? product.enabled : true
  };
  console.log('Formulario inicializado:', formData.value);
}

onMounted(() => {
  if (props.editMode && props.product) {
    initializeFormData(props.product);
  }
})

// Observar cambios en el producto para actualizar el formulario
watch(() => props.product, (newProduct) => {
  if (newProduct && props.editMode) {
    initializeFormData(newProduct);
  }
}, { deep: true })

const handleImageChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      formData.value.imagen = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

const handleSubmit = async () => {
  try {
    console.log('Enviando datos del formulario:', formData.value);
    
    if (props.editMode) {
      if (!props.product?.id) {
        throw new Error('No se puede actualizar el producto: ID no válido');
      }
      
      const productoData = {
        id: props.product.id,
        nombre: formData.value.nombre,
        descripcion: formData.value.descripcion,
        precio: formData.value.precio,
        stock: formData.value.stock,
        imagen: formData.value.imagen,
        activo: formData.value.activo
      };

      console.log('Actualizando producto con datos:', productoData);
      await productStore.updateProduct(productoData);
    } else {
      const productoData = {
        nombre: formData.value.nombre,
        descripcion: formData.value.descripcion,
        precio: formData.value.precio,
        stock: formData.value.stock,
        imagen: formData.value.imagen,
        activo: formData.value.activo
      };

      console.log('Creando nuevo producto con datos:', productoData);
      await productStore.addProduct(productoData);
    }
    
    // Solo cerramos el modal si no hay errores
    if (!productStore.getError) {
      emit('close');
    }
  } catch (error) {
    console.error('Error al procesar el formulario:', error);
    productStore.error = error.message;
  }
}
</script> 