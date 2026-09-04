# NAV - Navegador Proxy 100% Funcional

Un navegador web basado en proxy con enfoque en **privacidad y anonimato**. Funciona completamente con Node.js + Express como backend proxy.

## 🚀 Instalación y Ejecución

### 1. Requisitos
- Node.js 14+ (recomendado Node.js 18+)
- npm o yarn
- Conexión a internet

### 2. Instalar dependencias

```bash
cd /workspace/github__chromeking-gg__Nav
npm install
```

### 3. Iniciar el servidor

```bash
# Modo producción
npm start

# Modo desarrollo (con recarga automática)
npm run dev
```

El servidor se iniciará en: **http://localhost:3000**

### 4. Abrir en el navegador

Abre tu navegador favorito y ve a:
```
http://localhost:3000
```

## ✨ Características

### 🔒 Privacidad y Seguridad
- ✅ **Proxy HTTP/HTTPS** - Navega a través de un servidor intermedio
- ✅ **Soporte TOR** - Opción para usar la red TOR (vía tor2web)
- ✅ **User-Agent Aleatorio** - Cambia automáticamente entre diferentes navegadores
- ✅ **Bloqueo de Cookies** - Deshabilita cookies por defecto
- ✅ **Bloqueo WebRTC** - Previene fugas de IP real
- ✅ **Bloqueo Geolocalización** - Impide acceso a tu ubicación
- ✅ **Anti-Fingerprinting** - Modifica propiedades del navegador
- ✅ **Bloqueo de Trackers** - Elimina scripts de rastreo (Google Analytics, Facebook, etc.)
- ✅ **Sandbox del Iframe** - Aislamiento de seguridad
- ✅ **Encabezados de Seguridad** - CORS, CSP, HSTS

### 🎨 Interfaz de Usuario
- 🌐 Barra de navegación con autocompletado
- 📑 Múltiples pestañas con cierre individual
- ⚙️ Panel de configuración de privacidad
- 📜 Historial de navegación
- ⭐ Sistema de favoritos (próximamente)
- 🔒 Modo privado (no guarda historial)
- 📊 Indicadores de estado en tiempo real
- 📱 Diseño responsive para móvil

### 🎯 Tipos de Proxy
| Tipo | Descripción | Nivel de Anonimato |
|------|-------------|-------------------|
| **Directo** | Conexión directa sin proxy | ⭐ |
| **HTTPS** | Proxy HTTPS estándar | ⭐⭐⭐ |
| **TOR** | Red TOR (máxima privacidad) | ⭐⭐⭐⭐⭐ |

## 📁 Estructura del Proyecto

```
nav-proxy-browser/
├── public/
│   └── index.html          # Frontend (HTML + CSS + JavaScript)
├── server.js              # Backend (Express + Proxy)
├── package.json           # Dependencias y scripts
└── README.md              # Documentación
```

## 🛠️ Configuración

### Opciones de Privacidad

Puedes configurar las siguientes opciones en el panel de configuración (⚙️):

- **Tipo de Proxy**: Directo, HTTPS, TOR
- **Cifrado SSL/TLS**: Habilitar/deshabilitar
- **Bloqueo de Trackers**: Eliminar scripts de rastreo
- **Deshabilitar Cookies**: Prevenir almacenamiento de cookies
- **Bloquear WebRTC**: Evitar fugas de IP
- **Bloquear Geolocalización**: Impedir acceso a ubicación
- **Anti-Fingerprinting**: Proteger contra identificación

### User-Agent

Selecciona entre diferentes User-Agents:
- Aleatorio (cambia en cada solicitud)
- Google Chrome
- Mozilla Firefox
- Apple Safari
- Microsoft Edge
- Dispositivo móvil

## 🌍 ¿Cómo Funciona?

### Arquitectura

```
Cliente (Navegador)
    ↓ HTTPS
Servidor NAV (Node.js + Express)
    ↓ Proxy
Sitio Web Destino
    ↓ Respuesta
Servidor NAV (Modifica encabezados, bloquea trackers)
    ↓ HTTPS
Cliente (Navegador)
```

### Flujo de Navegación

1. El usuario ingresa una URL en el navegador NAV
2. El frontend envía la solicitud al servidor proxy local
3. El servidor proxy:
   - Modifica el User-Agent
   - Elimina cookies y encabezados de rastreo
   - Añade encabezados de seguridad
   - Redirige la solicitud al sitio destino
4. El sitio destino responde al servidor proxy
5. El servidor proxy:
   - Elimina cookies de la respuesta
   - Añade políticas de seguridad
   - Envía la respuesta al cliente
6. El cliente muestra el contenido en un iframe con sandbox

## 🔧 Personalización

### Cambiar el Puerto

Edita el archivo `server.js` y modifica:
```javascript
const PORT = process.env.PORT || 3000; // Cambia 3000 por el puerto deseado
```

### Añadir Más User-Agents

Edita el array en `public/index.html`:
```javascript
function getRandomUserAgent() {
    const agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...',
        // Añade más User-Agents aquí
    ];
    return agents[Math.floor(Math.random() * agents.length)];
}
```

### Configurar Proxy Externo

Para usar un proxy externo en lugar del local, modifica `server.js`:
```javascript
// En la función createDynamicProxy
const proxy = createProxyMiddleware({
    target: 'http://tu-proxy-externo:8080', // Cambia por tu proxy
    // ...
});
```

## ⚠️ Limitaciones

### 1. Restricciones del Navegador
- Algunos sitios pueden bloquear iframes con sandbox
- El CORS puede limitar el acceso a ciertos sitios
- Los sitios HTTPS requieren configuración adecuada

### 2. Proxy TOR
- El modo TOR usa tor2web.org que puede tener limitaciones
- Para TOR real, necesitas configurar un nodo TOR local

### 3. Rendimiento
- La navegación a través de proxy puede ser más lenta
- Algunos sitios pueden no cargar correctamente

## 🎯 Recomendaciones para Máxima Privacidad

1. **Usa el modo TOR** para máxima anonimidad
2. **Habilita todas las opciones de privacidad** en la configuración
3. **Navega en modo privado** para no guardar historial
4. **Usa una VPN** adicional para más protección
5. **No inicies sesión** en sitios mientras uses el proxy
6. **Limpia caché e historial** regularmente

## 🐛 Solución de Problemas

### El proxy no funciona
1. Verifica que el servidor esté ejecutándose: `npm start`
2. Revisa la consola del navegador (F12) para errores
3. Prueba con diferentes tipos de proxy

### Los sitios no cargan
1. Intenta con otro tipo de proxy
2. Verifica que la URL sea correcta (debe incluir http:// o https://)
3. Algunos sitios bloquean iframes por seguridad

### Error de conexión
1. Asegúrate de que el servidor esté en ejecución
2. Verifica que el puerto (3000) no esté bloqueado
3. Prueba accediendo a http://localhost:3000 directamente

## 📊 API del Servidor

El servidor expone las siguientes rutas:

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/` | GET | Sirve el frontend |
| `/api/config` | GET | Obtiene configuración de privacidad |
| `/api/user-agent` | GET | Obtiene un User-Agent aleatorio |
| `/api/history` | GET | Obtiene el historial |
| `/api/clear-cache` | POST | Limpia la caché |
| `/api/clear-cookies` | POST | Limpia las cookies |
| `/api/save-config` | POST | Guarda la configuración |
| `/proxy/:url` | GET/POST | Proxy HTTP/HTTPS |
| `/tor/:url` | GET/POST | Proxy TOR |

## 🔒 Seguridad

### Medidas Implementadas
- ✅ Helmet para encabezados de seguridad
- ✅ CORS configurado
- ✅ Bloqueo de WebRTC
- ✅ Bloqueo de geolocalización
- ✅ Anti-fingerprinting
- ✅ Eliminación de cookies
- ✅ Bloqueo de trackers
- ✅ Sandbox en iframes

### Recomendaciones Adicionales
- Ejecuta el servidor en un entorno aislado
- Usa HTTPS con certificados válidos
- Mantén las dependencias actualizadas
- No expongas el servidor a internet público

## 📈 Roadmap

- [x] Navegador proxy funcional
- [x] Multiple tipos de proxy
- [x] Protección de privacidad
- [x] User-Agent aleatorio
- [x] Bloqueo de trackers
- [x] Modo privado
- [ ] Sistema de favoritos
- [ ] Gestión de pestañas mejorada
- [ ] Integración con TOR real
- [ ] Soporte para extensiones
- [ ] Navegación por pestañas independientes

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor abre un Issue o Pull Request.

## 📄 Licencia

MIT License

---

**¡Navega con privacidad!** 🌐🔒
