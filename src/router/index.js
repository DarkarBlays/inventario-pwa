import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'

const routes = [
  {
    path: '/',
    redirect: '/inventory'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/inventory',
    name: 'Inventory',
    component: () => import('../views/Inventory.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Guardia de navegación para proteger rutas
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // Si la ruta requiere autenticación y no hay token/usuario
  if (to.meta.requiresAuth && !authStore.estaAutenticado) {
    next({ name: 'Login' })
    return
  }
  
  // Si la ruta es para invitados (como login) y hay una sesión activa
  if (to.meta.requiresGuest && authStore.estaAutenticado) {
    next({ name: 'Inventory' })
    return
  }
  
  next()
})

export default router 