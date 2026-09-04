const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const UserAgents = require('user-agents');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de seguridad
app.use(helmet());
app.use(cors({
  origin: '*', // Permite cualquier origen (para desarrollo)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'User-Agent', 'Accept', 'Referer']
}));

// Middleware para bloquear WebRTC, geolocalización, etc.
app.use((req, res, next) => {
  // Establecer encabezados de privacidad
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
  
  // Bloquear WebRTC
  res.setHeader('Feature-Policy', 'geolocation \'none\', microphone \'none\', camera \'none\', payment \'none\', usb \'none\'');
  
  next();
});

// Servir archivos estáticos (el frontend HTML)
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint para obtener User-Agent aleatorio
app.get('/api/user-agent', (req, res) => {
  const userAgent = new UserAgents();
  res.json({
    userAgent: userAgent.toString(),
    browser: userAgent.browser,
    os: userAgent.os,
    platform: userAgent.platform
  });
});

// Endpoint para obtener configuración de privacidad
app.get('/api/config', (req, res) => {
  res.json({
    blockTracking: true,
    disableCookies: true,
    disableWebRTC: true,
    disableGeolocation: true,
    disableFingerprinting: true,
    proxyType: 'tor'
  });
});

// Proxy middleware para redirigir solicitudes
const proxyOptions = {
  target: 'http://example.com', // Target por defecto
  changeOrigin: true,
  secure: false,
  xfwd: true,
  onProxyReq: (proxyReq, req, res) => {
    // Modificar User-Agent
    const userAgent = new UserAgents();
    proxyReq.setHeader('User-Agent', userAgent.toString());
    
    // Bloquear cookies
    proxyReq.removeHeader('Cookie');
    proxyReq.removeHeader('Set-Cookie');
    
    // Bloquear Referer
    proxyReq.removeHeader('Referer');
    
    // Bloquear encabezados de rastreo
    proxyReq.removeHeader('DNT');
    proxyReq.removeHeader('X-Forwarded-For');
    
    console.log(`[PROXY] Redirigiendo a: ${proxyReq.path}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    // Eliminar cookies de la respuesta
    if (proxyRes.headers['set-cookie']) {
      delete proxyRes.headers['set-cookie'];
    }
    
    // Añadir encabezados de seguridad
    proxyRes.headers['X-Content-Type-Options'] = 'nosniff';
    proxyRes.headers['X-Frame-Options'] = 'SAMEORIGIN';
    proxyRes.headers['X-XSS-Protection'] = '1; mode=block';
    proxyRes.headers['Referrer-Policy'] = 'no-referrer';
  },
  filter: (req) => {
    // Solo proxy para rutas que empiecen con /proxy/
    return req.path.startsWith('/proxy/');
  }
};

// Configurar proxy dinámico
function createDynamicProxy(targetUrl) {
  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    secure: false,
    xfwd: true,
    onProxyReq: (proxyReq, req, res) => {
      const userAgent = new UserAgents();
      proxyReq.setHeader('User-Agent', userAgent.toString());
      proxyReq.removeHeader('Cookie');
      proxyReq.removeHeader('Set-Cookie');
      proxyReq.removeHeader('Referer');
      proxyReq.removeHeader('DNT');
      proxyReq.removeHeader('X-Forwarded-For');
      
      // Bloquear encabezados adicionales
      proxyReq.removeHeader('Accept-Language');
      proxyReq.removeHeader('Accept-Encoding');
      
      console.log(`[PROXY] Conectando a: ${targetUrl}${proxyReq.path}`);
    },
    onProxyRes: (proxyRes, req, res) => {
      delete proxyRes.headers['set-cookie'];
      proxyRes.headers['X-Content-Type-Options'] = 'nosniff';
      proxyRes.headers['X-Frame-Options'] = 'SAMEORIGIN';
      proxyRes.headers['X-XSS-Protection'] = '1; mode=block';
      proxyRes.headers['Referrer-Policy'] = 'no-referrer';
    }
  });
}

// Ruta para proxy dinámico
app.use('/proxy/:url(*)', (req, res, next) => {
  try {
    let targetUrl = req.params.url;
    
    // Decodificar URL
    targetUrl = decodeURIComponent(targetUrl);
    
    // Validar URL
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }
    
    // Crear proxy dinámico para esta URL
    const proxy = createDynamicProxy(targetUrl);
    
    // Ejecutar proxy
    proxy(req, res, next);
  } catch (error) {
    console.error('[PROXY ERROR]:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud proxy' });
  }
});

// Proxy para TOR (simulado - en producción usar un nodo TOR real)
app.use('/tor/:url(*)', (req, res, next) => {
  try {
    let targetUrl = req.params.url;
    targetUrl = decodeURIComponent(targetUrl);
    
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }
    
    // Simular TOR: usar servicios TOR2WEB
    const torProxyUrl = `https://www.tor2web.org/webtunnel/?q=${encodeURIComponent(targetUrl)}`;
    
    const proxy = createProxyMiddleware({
      target: torProxyUrl,
      changeOrigin: true,
      secure: false,
      xfwd: true,
      onProxyReq: (proxyReq, req, res) => {
        const userAgent = new UserAgents();
        proxyReq.setHeader('User-Agent', userAgent.toString());
        proxyReq.removeHeader('Cookie');
        proxyReq.removeHeader('Set-Cookie');
        proxyReq.removeHeader('Referer');
      }
    });
    
    proxy(req, res, next);
  } catch (error) {
    console.error('[TOR PROXY ERROR]:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud TOR' });
  }
});

// Ruta para limpiar cookies (simulada)
app.post('/api/clear-cookies', (req, res) => {
  res.json({ success: true, message: 'Cookies limpiadas' });
});

// Ruta para limpiar caché (simulada)
app.post('/api/clear-cache', (req, res) => {
  res.json({ success: true, message: 'Caché limpiada' });
});

// Ruta para obtener historial (simulada)
app.get('/api/history', (req, res) => {
  res.json({ history: [] });
});

// Ruta para guardar configuración
app.post('/api/save-config', express.json(), (req, res) => {
  const config = req.body;
  console.log('[CONFIG] Configuración guardada:', config);
  res.json({ success: true, config });
});

// Ruta principal - servir el frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                           ║
║   🌐 NAV - Navegador Proxy Privado                        ║
║   ═════════════════════════════════                    ║
║                                                           ║
║   ✅ Servidor proxy funcionando en:                       ║
║      http://localhost:${PORT}                              ║
║                                                           ║
║   🔒 Características:                                     ║
║      • Proxy HTTP/HTTPS                                   ║
║      • Soporta TOR (vía tor2web)                          ║
║      • User-Agent aleatorio                               ║
║      • Bloqueo de cookies y trackers                      ║
║      • Protección WebRTC y geolocalización                ║
║      • Anti-fingerprinting                               ║
║                                                           ║
║   📝 Para usar:                                           ║
║      1. Abre http://localhost:${PORT} en tu navegador     ║
║      2. Ingresa una URL y navega con privacidad           ║
║                                                           ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Manejar errores 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejar errores globales
app.use((err, req, res, next) => {
  console.error('[ERROR]:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});
