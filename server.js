const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const UserAgents = require('user-agents');
const path = require('path');
const { JSDOM } = require('jsdom');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de seguridad
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'ALLOW-FROM http://localhost:3000');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
  next();
});

// User-Agents aleatorios
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
  'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
];

// Bloquear dominios de rastreo
const blockedDomains = [
  'google-analytics.com',
  'facebook.com',
  'facebook.net',
  'doubleclick.net',
  'googlesyndication.com',
  'adservice.google.com',
  'adserver',
  'tracker',
  'adsystem.com'
];

// Función para obtener User-Agent aleatorio
function getRandomUserAgent() {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// Función para bloquear scripts de rastreo
function filterTrackingContent(html, baseUrl) {
  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Remover scripts de rastreo
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
      const src = script.src.toLowerCase();
      if (blockedDomains.some(domain => src.includes(domain))) {
        script.remove();
      }
    });
    
    // Remover iframes de publicidad
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      const src = iframe.src.toLowerCase();
      if (blockedDomains.some(domain => src.includes(domain)) || 
          src.includes('ads') || 
          src.includes('adserver')) {
        iframe.remove();
      }
    });
    
    // Remover elementos con clases de ads
    const adElements = document.querySelectorAll('[class*="ad"], [class*="Ad"], [id*="ad"], [id*="Ad"]');
    adElements.forEach(el => el.remove());
    
    // Modificar enlaces para que pasen por el proxy
    const links = document.querySelectorAll('a[href], img[src], script[src], link[href], iframe[src]');
    links.forEach(link => {
      const href = link.getAttribute('href') || link.getAttribute('src');
      if (href && !href.startsWith('data:') && !href.startsWith('javascript:') && !href.startsWith('#')) {
        try {
          const url = new URL(href, baseUrl);
          if (url.hostname !== window.location.hostname) {
            // Convertir a URL absoluta del proxy
            const proxyUrl = `/proxy?url=${encodeURIComponent(url.href)}`;
            if (link.tagName === 'A') {
              link.href = proxyUrl;
            } else if (link.tagName === 'IMG' || link.tagName === 'SCRIPT' || link.tagName === 'LINK' || link.tagName === 'IFRAME') {
              link.src = proxyUrl;
            }
          }
        } catch (e) {
          // Ignorar errores de URL
        }
      }
    });
    
    // Remover cookies
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Set-Cookie';
    meta.content = 'name=value; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.head.appendChild(meta);
    
    // Añadir meta tags de privacidad
    const referrerMeta = document.createElement('meta');
    referrerMeta.name = 'referrer';
    referrerMeta.content = 'no-referrer';
    document.head.appendChild(referrerMeta);
    
    return dom.serialize();
  } catch (error) {
    console.error('Error filtering content:', error);
    return html;
  }
}

// Ruta para proxy
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
    
    // Configurar headers
    const headers = {
      'User-Agent': getRandomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9',
      'Referer': 'https://google.com/',
      'DNT': '1'
    };
    
    // Hacer la petición
    const response = await axios.get(targetUrl, {
      headers,
      timeout: 30000,
      responseType: 'text'
    });
    
    // Filtrar contenido
    const filteredHtml = filterTrackingContent(response.data, targetUrl);
    
    // Enviar el HTML
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(filteredHtml);
    
  } catch (error) {
    console.error('Proxy error:', error.message);
    
    // Mostrar error
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error de Proxy</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background: #1a1a1a;
              color: #ff4444;
              padding: 40px;
              text-align: center;
              margin: 0;
            }
            h1 { color: #ff4444; }
            p { color: #ccc; }
            a {
              color: #00ff88;
              text-decoration: none;
              display: inline-block;
              margin: 10px;
              padding: 10px 20px;
              border: 1px solid #00ff88;
              border-radius: 5px;
            }
            a:hover { 
              background: #00ff88;
              color: #000;
            }
            .error-details {
              font-size: 12px;
              color: #666;
              margin-top: 20px;
              text-align: left;
              max-width: 600px;
              margin-left: auto;
              margin-right: auto;
            }
          </style>
        </head>
        <body>
          <h1>❌ Error de Proxy</h1>
          <p><strong>No se pudo cargar la página:</strong> ${error.message || 'Error desconocido'}</p>
          <p>
            <a href="javascript:history.back()">⬅️ Volver atrás</a>
            <a href="/">🏠 Ir al inicio</a>
          </p>
          <div class="error-details">
            <p><strong>Posibles soluciones:</strong></p>
            <ol style="text-align: left;">
              <li>Verifica que la URL sea correcta (debe incluir http:// o https://)</li>
              <li>El sitio puede estar bloqueando el acceso</li>
              <li>Prueba con otra página web</li>
              <li>Algunos sitios no permiten ser accedidos a través de proxies</li>
            </ol>
          </div>
        </body>
      </html>
    `);
  }
});

// Ruta para obtener recursos (CSS, JS, imágenes)
app.get('/resource', async (req, res) => {
  try {
    const url = req.query.url;
    
    if (!url) {
      return res.status(400).send('URL is required');
    }
    
    const headers = {
      'User-Agent': getRandomUserAgent(),
      'Referer': 'https://google.com/',
      'DNT': '1'
    };
    
    const response = await axios.get(url, {
      headers,
      timeout: 30000,
      responseType: 'arraybuffer'
    });
    
    // Determinar el Content-Type
    const contentType = response.headers['content-type'] || 'application/octet-stream';
    res.set('Content-Type', contentType);
    res.send(response.data);
    
  } catch (error) {
    console.error('Resource error:', error.message);
    res.status(500).send('Error al cargar el recurso');
  }
});

// API endpoints
app.get('/api/config', (req, res) => {
  res.json({
    status: 'running',
    message: 'Servidor proxy funcionando',
    defaultUrl: 'https://duckduckgo.com'
  });
});

app.get('/api/user-agent', (req, res) => {
  res.json({
    userAgent: getRandomUserAgent()
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
║   🌐 NAV - Navegador Proxy REAL                               ║
║                                                               ║
║   ✅ Servidor proxy funcionando en: http://localhost:${PORT}    ║
║                                                               ║
║   📌 Para usar:                                               ║
║      1. Abre http://localhost:${PORT} en tu navegador          ║
║      2. Escribe una URL y haz clic en "IR"                    ║
║      3. DuckDuckGo se cargará automáticamente                ║
║                                                               ║
║   🔧 Características:                                         ║
║      • Proxy HTTP/HTTPS real                                  ║
║      • Filtra scripts de rastreo                              ║
║      • User-Agent aleatorio                                   ║
║      • Bloquea cookies                                        ║
║      • Protección de privacidad                               ║
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
