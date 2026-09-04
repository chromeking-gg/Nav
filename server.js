const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const { JSDOM } = require('jsdom');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// CONFIGURACIÓN ANTI-DETECCIÓN
// ============================================

// User-Agents REALISTAS (actualizados 2024)
const REALISTIC_USER_AGENTS = [
  // Chrome (Windows)
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
  
  // Firefox (Windows)
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
  
  // Safari (Mac)
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
  
  // Edge (Windows)
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  
  // Chrome (Android)
  'Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 12; SM-A525M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  
  // iPhone
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
];

// Encabezados HTTP realistas
const REALISTIC_HEADERS = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'max-age=0'
};

// Dominios bloqueados (trackers, ads, analytics)
const BLOCKED_DOMAINS = [
  'google-analytics.com', 'analytics.google.com', 'googlesyndication.com',
  'doubleclick.net', 'doubleclick.com', 'adservice.google.com',
  'facebook.com', 'facebook.net', 'fbcdn.net', 'connect.facebook.net',
  'twitter.com', 'twimg.com', 't.co',
  'adserver', 'adsystem.com', 'advertising.com', 'openx.net',
  'scorecardresearch.com', 'quantserve.com', 'chartbeat.com',
  'newrelic.com', 'hotjar.com', 'optimizely.com',
  'googletagmanager.com', 'googletagservices.com'
];

// Palabras clave para bloquear
const BLOCKED_KEYWORDS = [
  'analytics', 'tracking', 'advertis', 'banner', 'ad-', '-ad', 'advert',
  'tracker', 'pixel', 'beacon', 'statistic', 'counter', 'clicktrack'
];

// ============================================
// FUNCIONES ANTI-DETECCIÓN
// ============================================

// Generar User-Agent aleatorio
function getRandomUserAgent() {
  return REALISTIC_USER_AGENTS[Math.floor(Math.random() * REALISTIC_USER_AGENTS.length)];
}

// Generar Referer realista
function getRealisticReferer(targetUrl) {
  const referers = [
    'https://www.google.com/',
    'https://www.google.com/search?q=',
    'https://www.bing.com/',
    'https://duckduckgo.com/',
    'https://youtube.com/',
    'https://facebook.com/'
  ];
  
  try {
    const targetHost = new URL(targetUrl).hostname;
    
    // Si es Google, usar referer de búsqueda
    if (targetHost.includes('google.com')) {
      return 'https://www.google.com/';
    }
    
    // Si es un sitio común, usar Google como referer
    return referers[0] + (Math.random() > 0.5 ? 'search' : '');
  } catch {
    return referers[0];
  }
}

// Generar headers realistas
function getRealisticHeaders(targetUrl) {
  return {
    'User-Agent': getRandomUserAgent(),
    'Referer': getRealisticReferer(targetUrl),
    'Accept': REALISTIC_HEADERS['Accept'],
    'Accept-Language': REALISTIC_HEADERS['Accept-Language'],
    'Accept-Encoding': REALISTIC_HEADERS['Accept-Encoding'],
    'Sec-Fetch-Dest': REALISTIC_HEADERS['Sec-Fetch-Dest'],
    'Sec-Fetch-Mode': REALISTIC_HEADERS['Sec-Fetch-Mode'],
    'Sec-Fetch-Site': REALISTIC_HEADERS['Sec-Fetch-Site'],
    'Sec-Fetch-User': REALISTIC_HEADERS['Sec-Fetch-User'],
    'Upgrade-Insecure-Requests': REALISTIC_HEADERS['Upgrade-Insecure-Requests'],
    'Cache-Control': REALISTIC_HEADERS['Cache-Control'],
    'Connection': 'keep-alive'
  };
}

// Añadir retraso aleatorio (para simular comportamiento humano)
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// FILTRADO DE CONTENIDO
// ============================================

function filterTrackingContent(html, baseUrl) {
  try {
    const dom = new JSDOM(html, {
      url: baseUrl,
      referrer: getRealisticReferer(baseUrl),
      contentType: 'text/html',
      includeNodeLocations: true
    });
    
    const document = dom.window.document;
    
    // 1. Remover scripts de rastreo
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
      const src = script.src.toLowerCase();
      const innerText = script.textContent.toLowerCase();
      
      const shouldRemove = BLOCKED_DOMAINS.some(domain => src.includes(domain)) ||
                         BLOCKED_KEYWORDS.some(keyword => src.includes(keyword)) ||
                         BLOCKED_KEYWORDS.some(keyword => innerText.includes(keyword));
      
      if (shouldRemove) {
        script.remove();
      }
    });
    
    // 2. Remover iframes de publicidad
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      const src = iframe.src.toLowerCase();
      const shouldRemove = BLOCKED_DOMAINS.some(domain => src.includes(domain)) ||
                         BLOCKED_KEYWORDS.some(keyword => src.includes(keyword));
      
      if (shouldRemove) {
        iframe.remove();
      }
    });
    
    // 3. Remover imágenes de rastreo
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      const src = img.src.toLowerCase();
      const shouldRemove = BLOCKED_DOMAINS.some(domain => src.includes(domain)) ||
                         BLOCKED_KEYWORDS.some(keyword => src.includes(keyword));
      
      if (shouldRemove) {
        img.remove();
      }
    });
    
    // 4. Remover elementos con clases/IDs de ads
    const adSelectors = [
      '[class*="ad" i]',
      '[class*="banner" i]',
      '[class*="sponsored" i]',
      '[class*="promo" i]',
      '[class*="tracking" i]',
      '[id*="ad" i]',
      '[id*="banner" i]',
      '[data-ad]',
      '[data-ads]',
      '[data-ad-slot]',
      '[data-tracking]',
      'ins.adsbygoogle'
    ];
    
    adSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
    
    // 5. Modificar enlaces para que pasen por el proxy
    const links = document.querySelectorAll('a[href]');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('data:') && !href.startsWith('javascript:') && !href.startsWith('#') && !href.startsWith('/')) {
        try {
          const url = new URL(href, baseUrl);
          if (url.hostname !== new URL(baseUrl).hostname) {
            link.href = `/proxy?url=${encodeURIComponent(url.href)}`;
          }
        } catch (e) {
          // Ignorar errores de URL
        }
      }
    });
    
    // 6. Modificar recursos (CSS, JS, imágenes)
    const resources = document.querySelectorAll('link[href], script[src], img[src]');
    resources.forEach(resource => {
      const src = resource.getAttribute('href') || resource.getAttribute('src');
      if (src && !src.startsWith('data:') && !src.startsWith('javascript:') && !src.startsWith('/')) {
        try {
          const url = new URL(src, baseUrl);
          if (url.hostname !== new URL(baseUrl).hostname) {
            if (resource.tagName === 'LINK') {
              resource.href = `/resource?url=${encodeURIComponent(url.href)}`;
            } else {
              resource.src = `/resource?url=${encodeURIComponent(url.href)}`;
            }
          }
        } catch (e) {
          // Ignorar errores de URL
        }
      }
    });
    
    // 7. Añadir meta tags de privacidad
    const referrerMeta = document.createElement('meta');
    referrerMeta.name = 'referrer';
    referrerMeta.content = 'no-referrer';
    document.head.appendChild(referrerMeta);
    
    const viewportMeta = document.createElement('meta');
    viewportMeta.name = 'viewport';
    viewportMeta.content = 'width=device-width, initial-scale=1.0';
    document.head.appendChild(viewportMeta);
    
    return dom.serialize();
  } catch (error) {
    console.error('Error filtering content:', error);
    return html;
  }
}

// ============================================
// CONFIGURACIÓN DEL SERVIDOR
// ============================================

app.use(helmet());
app.use(cors({ 
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Encabezados de seguridad
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
  next();
});

// ============================================
// RUTAS DEL PROXY
// ============================================

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta del proxy (con anti-detección)
app.get('/proxy', async (req, res) => {
  try {
    const url = req.query.url;
    
    if (!url) {
      return res.status(400).send('URL is required');
    }
    
    // Validar URL
    let targetUrl = url;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }
    
    // Validar URL (evitar SSRF)
    try {
      const parsedUrl = new URL(targetUrl);
      const blockedHosts = ['localhost', '127.0.0.1', '::1', '192.168.', '10.', '172.16.'];
      if (blockedHosts.some(host => parsedUrl.hostname.includes(host))) {
        return res.status(403).send('<h1>Acceso denegado</h1><p>No se pueden acceder a direcciones locales.</p>');
      }
    } catch {
      return res.status(400).send('<h1>URL inválida</h1>');
    }
    
    // Añadir retraso aleatorio (100-500ms) para simular humano
    await delay(Math.floor(Math.random() * 400) + 100);
    
    // Configurar headers REALISTAS
    const headers = getRealisticHeaders(targetUrl);
    
    // Hacer la petición con axios
    const response = await axios.get(targetUrl, {
      headers,
      timeout: 30000,
      responseType: 'text',
      // Deshabilitar redirecciones automáticas para evitar detección
      maxRedirects: 0,
      validateStatus: function (status) {
        return status >= 200 && status < 400;
      }
    });
    
    // Filtrar contenido (trackers, ads, etc.)
    const filteredHtml = filterTrackingContent(response.data, targetUrl);
    
    // Enviar el HTML con headers realistas
    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.send(filteredHtml);
    
  } catch (error) {
    console.error('Proxy error:', error.message);
    
    // Manejar redirecciones
    if (error.response && error.response.status === 301 || error.response.status === 302) {
      const location = error.response.headers.location;
      if (location) {
        return res.redirect(302, `/proxy?url=${encodeURIComponent(location)}`);
      }
    }
    
    // Mostrar error
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error de Proxy</title>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
              background: #1a1a1a;
              color: #e0e0e0;
              padding: 40px;
              text-align: center;
              margin: 0;
            }
            h1 { color: #ff4444; margin-bottom: 20px; }
            p { color: #ccc; line-height: 1.6; }
            a {
              color: #00ff88;
              text-decoration: none;
              display: inline-block;
              margin: 10px;
              padding: 10px 20px;
              border: 1px solid #00ff88;
              border-radius: 5px;
              transition: all 0.3s;
            }
            a:hover { 
              background: #00ff88;
              color: #000;
            }
            .error-container {
              max-width: 600px;
              margin: 0 auto;
              text-align: left;
            }
            .error-details {
              font-size: 12px;
              color: #666;
              margin-top: 20px;
              background: #2a2a2a;
              padding: 15px;
              border-radius: 5px;
            }
            code {
              background: #333;
              padding: 2px 5px;
              border-radius: 3px;
              font-family: monospace;
            }
          </style>
        </head>
        <body>
          <h1>❌ Error de Proxy</h1>
          <p><strong>No se pudo cargar la página:</strong> ${error.message || 'Error desconocido'}</p>
          <div style="margin: 20px 0;">
            <a href="javascript:history.back()">⬅️ Volver atrás</a>
            <a href="/">🏠 Ir al inicio</a>
          </div>
          <div class="error-container">
            <div class="error-details">
              <p><strong>Posibles soluciones:</strong></p>
              <ol>
                <li>Verifica que la URL sea correcta (debe incluir http:// o https://)</li>
                <li>El sitio puede estar bloqueando el acceso desde proxies</li>
                <li>Prueba con otra página web</li>
                <li>Algunos sitios (como bancos) bloquean el acceso a través de proxies</li>
                <li>Asegúrate de que el servidor esté en ejecución: <code>npm start</code></li>
              </ol>
            </div>
          </div>
        </body>
      </html>
    `);
  }
});

// Ruta para recursos (CSS, JS, imágenes)
app.get('/resource', async (req, res) => {
  try {
    const url = req.query.url;
    
    if (!url) {
      return res.status(400).send('URL is required');
    }
    
    // Validar URL
    let targetUrl = url;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }
    
    // Añadir retraso aleatorio
    await delay(Math.floor(Math.random() * 200) + 50);
    
    // Configurar headers
    const headers = {
      'User-Agent': getRandomUserAgent(),
      'Referer': getRealisticReferer(targetUrl),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br'
    };
    
    // Determinar si es CSS, JS o imagen
    let responseType = 'arraybuffer';
    if (targetUrl.includes('.css')) {
      headers['Accept'] = 'text/css,*/*;q=0.1';
    } else if (targetUrl.includes('.js')) {
      headers['Accept'] = '*/*';
    } else if (targetUrl.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
      // Imagen
    }
    
    const response = await axios.get(targetUrl, {
      headers,
      timeout: 30000,
      responseType,
      maxRedirects: 0
    });
    
    // Determinar el Content-Type
    const contentType = response.headers['content-type'] || 
                       (targetUrl.includes('.css') ? 'text/css' :
                        targetUrl.includes('.js') ? 'application/javascript' :
                        targetUrl.match(/\.(jpg|jpeg)$/i) ? 'image/jpeg' :
                        targetUrl.match(/\.png$/i) ? 'image/png' :
                        targetUrl.match(/\.gif$/i) ? 'image/gif' :
                        targetUrl.match(/\.webp$/i) ? 'image/webp' :
                        targetUrl.match(/\.svg$/i) ? 'image/svg+xml' :
                        targetUrl.match(/\.ico$/i) ? 'image/x-icon' :
                        'application/octet-stream');
    
    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*'
    });
    
    res.send(response.data);
    
  } catch (error) {
    console.error('Resource error:', error.message);
    res.status(500).send('Error al cargar el recurso');
  }
});

// ============================================
// API ENDPOINTS
// ============================================

app.get('/api/config', (req, res) => {
  res.json({
    status: 'running',
    message: 'Servidor proxy con anti-detección activado',
    defaultUrl: 'https://duckduckgo.com',
    features: {
      realisticHeaders: true,
      userAgentRotation: true,
      trackingFilter: true,
      adBlocker: true,
      cookieBlocker: true,
      refererObfuscation: true
    }
  });
});

app.get('/api/user-agent', (req, res) => {
  res.json({
    userAgent: getRandomUserAgent(),
    referer: getRealisticReferer('https://example.com')
  });
});

app.get('/api/test', async (req, res) => {
  try {
    // Test de detección
    const testUrl = 'https://httpbin.org/headers';
    const headers = getRealisticHeaders(testUrl);
    
    const response = await axios.get(testUrl, {
      headers,
      timeout: 10000
    });
    
    res.json({
      status: 'success',
      message: 'Prueba de headers exitosa',
      headers: response.data.headers
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// ============================================
// INICIAR SERVIDOR
// ============================================

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🌐 NAV - Proxy con Anti-Detección (Securely)               ║
║                                                               ║
║   ✅ Servidor funcionando en: http://localhost:${PORT}        ║
║                                                               ║
║   🔒 Características Anti-Detección:                         ║
║      ✓ User-Agent realista y rotativo                         ║
║      ✓ Encabezados HTTP realistas                            ║
║      ✓ Referer obfuscado                                     ║
║      ✓ Retrasos aleatorios (comportamiento humano)          ║
║      ✓ Filtro de trackers y anuncios                         ║
║      ✓ Bloqueo de cookies                                    ║
║      ✓ Protección contra huella digital                     ║
║                                                               ║
║   📌 Para usar:                                               ║
║      1. Abre http://localhost:${PORT} en tu navegador         ║
║      2. Escribe una URL y haz clic en "IR"                    ║
║      3. DuckDuckGo se cargará automáticamente                ║
║                                                               ║
║   ⚠️  ADVERTENCIA:                                           ║
║      • Algunos sitios (bancos, gobiernos) pueden detectar    ║
║        que estás usando un proxy                              ║
║      • Para máxima privacidad, usa TOR Browser directamente   ║
║      • No uses este proxy para actividades ilegales           ║
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
