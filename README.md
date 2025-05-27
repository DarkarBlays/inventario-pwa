# Inventario PWA

Sistema de Inventario Progressive Web App (PWA) con capacidades offline.

## 🚀 Tecnologías Utilizadas

### Vue 3 + Vite
- **¿Por qué Vue 3?**
  - Composición API para mejor organización del código
  - Mejor rendimiento que versiones anteriores
  - Excelente integración con TypeScript
  - Sistema de reactividad mejorado

- **¿Por qué Vite?**
  - Desarrollo más rápido con Hot Module Replacement (HMR)
  - Mejor tiempo de compilación
  - Configuración simplificada
  - Soporte nativo para PWA

### Tailwind CSS
- **Ventajas**
  - Desarrollo rápido con utilidades predefinidas
  - Altamente personalizable mediante configuración
  - Optimización automática para producción
  - Excelente integración con Vue 3
  - Diseño responsive sin necesidad de media queries
  - Sistema de diseño consistente
  - Clases utilitarias que facilitan el mantenimiento

### Pinia
- **Ventajas sobre Vuex**
  - Sintaxis más simple y moderna
  - Mejor soporte para TypeScript
  - Mejor integración con Vue DevTools
  - Modular y escalable

### PWA (Progressive Web App)
- Implementación usando `vite-plugin-pwa`
- Service Worker personalizado para:
  - Cacheo de recursos estáticos
  - Funcionamiento offline
  - Sincronización en segundo plano
  - Actualizaciones automáticas

## 💾 Arquitectura de Almacenamiento

### IndexedDB
- Base de datos local para:
  - Productos
  - Datos de autenticación
  - Cola de sincronización

```javascript
Estructura de Stores:
- products: { id, name, price, stock, ... }
- auth: { email, token, usuario, ... }
```

### LocalStorage
- Almacenamiento de:
  - Token de autenticación
  - Preferencias de usuario
  - Estado de sincronización

## 🔄 Sincronización Offline/Online

### Estrategia de Sincronización
1. **Modo Online**
   - Peticiones directas al servidor
   - Actualización de IndexedDB
   - Cacheo de respuestas

2. **Modo Offline**
   - Operaciones guardadas en IndexedDB
   - Cola de sincronización para cambios pendientes
   - UI actualizada con datos locales

3. **Recuperación de Conexión**
   - Sincronización automática de cambios pendientes
   - Resolución de conflictos
   - Actualización de estado local

### Manejo de Conflictos
- Estrategia "Last Write Wins"
- Registro de timestamps para cambios
- Merge de datos en caso de conflictos

## 🛡️ Manejo de Errores

### Estrategias de Retry
- Reintentos exponenciales para peticiones fallidas
- Máximo 3 intentos por operación
- Delay incremental entre intentos

### Errores de Red
```javascript
try {
  // Intento de operación online
} catch (error) {
  if (!navigator.onLine) {
    // Guardar en cola de sincronización
  }
}
```

### Recuperación de Errores
- Limpieza automática de datos corruptos
- Reinicio de IndexedDB en caso de errores críticos
- Logs detallados para debugging

## 🔒 Seguridad

### Autenticación
- JWT almacenado de forma segura
- Renovación automática de tokens
- Manejo de sesiones offline

### Datos Sensibles
- Encriptación de datos locales sensibles
- Limpieza automática de datos al cerrar sesión
- Validación de integridad de datos

## 📱 Características PWA

### Service Worker
- Estrategias de cache personalizadas
- Actualizaciones en segundo plano
- Notificaciones push

### Instalación
- Prompt de instalación personalizado
- Detección de plataforma
- Experiencia adaptativa

## 🚦 Variables de Entorno
```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3000/api
VITE_API_TIMEOUT=3000

# Auth Configuration
VITE_TOKEN_KEY=token
VITE_USER_KEY=usuario
VITE_AUTH_HEADER=Bearer

# Cache Configuration
VITE_API_CACHE_NAME=api-cache
VITE_STATIC_CACHE_NAME=static-cache
VITE_AUTH_CACHE_NAME=auth-cache

# IndexedDB Configuration
VITE_DB_NAME=inventario_db
VITE_DB_VERSION=1

# Sync Configuration
VITE_SYNC_KEY=pendingSync
VITE_SYNC_TASK_NAME=sync-productos

# PWA Configuration
VITE_APP_NAME=Inventario PWA
VITE_APP_SHORT_NAME=Inventario
VITE_APP_DESCRIPTION=Sistema de Inventario PWA Profesional
VITE_APP_THEME_COLOR=#4f46e5
VITE_APP_BACKGROUND_COLOR=#ffffff

# Image Configuration
VITE_MAX_IMAGE_SIZE=5242880
VITE_IMAGE_QUALITY=0.7

```

## 🛠️ Configuración del Proyecto

```bash
# Instalación de dependencias
npm install

# Desarrollo
npm run dev

# Construcción para producción
npm run build

# Preview de producción
npm run preview
```

## 📚 Buenas Prácticas Implementadas

1. **Código Limpio**
   - Nombres descriptivos
   - Funciones pequeñas y específicas
   - Comentarios explicativos

2. **Patrones de Diseño**
   - Repository Pattern para datos
   - Factory Pattern para servicios
   - Observer Pattern para eventos

3. **Optimización**
   - Lazy loading de componentes
   - Compresión de imágenes
   - Minificación de assets

## 🔍 Debugging

### Herramientas Incluidas
- Vue DevTools configurado
- Logs detallados en desarrollo
- Monitoreo de Service Worker

### Comandos Útiles
```javascript
// Reiniciar IndexedDB
await import('./services/indexedDB.js').then(db => db.resetDatabase());

// Limpiar cache
await caches.delete('api-cache');
```

## 📈 Escalabilidad

El proyecto está diseñado para escalar mediante:
- Arquitectura modular
- Lazy loading de componentes
- Separación clara de responsabilidades
- Configuración centralizada
