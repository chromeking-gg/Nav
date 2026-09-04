const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const UserAgents = require('user-agents');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'User-Agent', 'Accept', 'Referer']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Encabezados de seguridad
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
  next();
});

// Lista de proxies públicos que funcionan
const WORKING_PROXIES = {
  'hideme': 'https://hide.me/es/proxy/',
  'croxy': 'https://www.croxyproxy.com/?url=',
  'kproxy': 'https://www.kproxy.com/browse.php?u=',
  'zend2': 'https://zend2.com/?q=',
  'direct': null
};

// Proxy dinámico
app.get('/proxy/*', async (req, res) => {
  try {
    const url = req.params[0]; // Captura todo después de /proxy/
    const decodedUrl = decodeURIComponent(url);
    
    // Validar URL
    let targetUrl = decodedUrl;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }
    
    // Usar proxy público
    const proxyType = req.query.type || 'croxy';
    const proxyUrl = WORKING_PROXIES[proxyType] || WORKING_PROXIES.croxy;
    
    if (proxyUrl) {
      // Redirigir al proxy público
      return res.redirect(302, proxyUrl + encodeURIComponent(targetUrl));
    }
    
    // Si no hay proxy, intentar hacer proxy directo (puede fallar por CORS)
    const userAgent = new UserAgents().toString();
    
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://google.com/',
        'DNT': '1'
      },
      timeout: 10000
    });
    
    // Enviar el HTML directamente
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(response.data);
    
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error de Proxy</title>
          <style>
            body { font-family: Arial, sans-serif; background: #1a1a1a; color: #ff4444; padding: 40px; text-align: center; }
            h1 { color: #ff4444; }
            p { color: #ccc; }
            a { color: #00ff88; text-decoration: none; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <h1>❌ Error de Proxy</h1>
          <p>No se pudo cargar la página. El servicio proxy puede estar caído.</p>
          <p>
            <strong>Soluciones:</strong><br>
            1. <a href="javascript:history.back()">Volver atrás</a><br>
            2. <a href="/">Ir al inicio</a><br>
            3. Prueba con otro tipo de proxy en la configuración
          </p>
          <p style="font-size: 12px; margin-top: 20px;">
            Error: ${error.message || 'Desconocido'}
          </p>
        </body>
      </html>
    `);
  }
});

// Proxy TOR (alternativa)
app.get('/tor/*', (req, res) => {
  try {
    const url = req.params[0];
    const decodedUrl = decodeURIComponent(url);
    let targetUrl = decodedUrl;
    
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }
    
    // Usar CroxyProxy como alternativa (TOR2Web ya no funciona)
    const torProxyUrl = `https://www.croxyproxy.com/?url=${encodeURIComponent(targetUrl)}`;
    res.redirect(302, torProxyUrl);
    
  } catch (error) {
    res.status(500).send('<h1>Error en proxy TOR</h1><p>Prueba con otro tipo de proxy.</p>');
  }
});

// API endpoints
app.get('/api/config', (req, res) => {
  res.json({
    proxyTypes: ['croxy', 'hideme', 'kproxy', 'direct'],
    defaultProxy: 'croxy',
    userAgents: ['random', 'chrome', 'firefox', 'safari', 'edge', 'mobile']
  });
});

app.get('/api/user-agent', (req, res) => {
  const userAgent = new UserAgents();
  res.json({
    userAgent: userAgent.toString(),
    browser: userAgent.browser,
    os: userAgent.os
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    message: 'Servidor proxy funcionando',
    proxies: Object.keys(WORKING_PROXIES)
  });
});

// Servir frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🌐 NAV - Navegador Proxy Privado                          ║
║                                                               ║
║   ✅ Servidor funcionando en: http://localhost:${PORT}        ║
║                                                               ║
║   📌 Para usar:                                               ║
║      1. Abre http://localhost:${PORT} en tu navegador         ║
║      2. Ingresa una URL y haz clic en "IR"                    ║
║      3. DuckDuckGo se cargará automáticamente                ║
║                                                               ║
║   🔧 Proxies disponibles:                                     ║
║      • CroxyProxy (recomendado)                              ║
║      • Hide.me                                               ║
║      • KProxy                                                ║
║      • Directo (sin proxy)                                   ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

// Manejar errores
app.use((req, res) => {
  res.status(404).send('<h1>404 - Página no encontrada</h1>');
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('<h1>500 - Error interno del servidor</h1>');
});
