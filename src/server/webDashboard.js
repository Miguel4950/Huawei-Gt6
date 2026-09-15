const http = require('http');
const config = require('../config/config');
const huaweiClient = require('../huawei/huaweiClient');
const huaweiSync = require('../huawei/huaweiSync');
const dataLoader = require('../data/dataLoader');

function renderHtml(status, message = null) {
  const isConnected = status.isConnected;
  const isConfigured = status.isConfigured;
  const creds = huaweiClient.getCredentials();

  // Estadísticas locales actuales
  const workoutCount = dataLoader.loadActivityRecords().length;
  const sleepCount = dataLoader.loadSleepRecords().length;
  const heartCount = dataLoader.loadHeartRateRecords().length;
  const stepsCount = dataLoader.loadStepsRecords().length;
  const oxygenCount = dataLoader.loadOxygenRecords().length;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Huawei Health Hub — Conexión Directa en la Nube</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: rgba(18, 24, 38, 0.75);
      --card-border: rgba(255, 255, 255, 0.08);
      --accent: #e50914;
      --accent-grad: linear-gradient(135deg, #ff2a54 0%, #ff6b3d 100%);
      --huawei-red: #cf0a2c;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --success: #10b981;
      --warning: #f59e0b;
      --info: #3b82f6;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Outfit', sans-serif;
      background: radial-gradient(circle at 50% 0%, #172136 0%, var(--bg) 75%);
      color: var(--text-main);
      min-height: 100vh;
      padding: 24px 16px 60px;
      line-height: 1.5;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
    }

    header {
      text-align: center;
      margin-bottom: 32px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    .badge-connected { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.3); }
    .badge-disconnected { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.3); }

    h1 {
      font-size: 2.2rem;
      font-weight: 800;
      background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
    }
    p.lead {
      color: var(--text-muted);
      font-size: 1.05rem;
    }

    .alert {
      padding: 16px 20px;
      border-radius: 12px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 0.95rem;
    }
    .alert-success { background: rgba(16, 185, 129, 0.12); border: 1px solid #10b981; color: #a7f3d0; }
    .alert-info { background: rgba(59, 130, 246, 0.12); border: 1px solid #3b82f6; color: #bfdbfe; }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      backdrop-filter: blur(16px);
      border-radius: 18px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    }
    .card h2 {
      font-size: 1.3rem;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    @media (max-width: 640px) {
      .grid-2 { grid-template-columns: 1fr; }
      h1 { font-size: 1.75rem; }
    }

    .step-item {
      display: flex;
      gap: 14px;
      margin-bottom: 16px;
    }
    .step-num {
      width: 28px;
      height: 28px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      flex-shrink: 0;
      color: #38bdf8;
    }
    .step-text strong {
      color: #fff;
      display: block;
      margin-bottom: 2px;
    }
    .step-text p {
      font-size: 0.9rem;
      color: var(--text-muted);
    }

    .scope-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
    .scope-pill {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 0.8rem;
      color: #e2e8f0;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    input[type="text"], input[type="password"] {
      width: 100%;
      background: rgba(11, 15, 25, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.12);
      padding: 12px 14px;
      border-radius: 10px;
      color: #fff;
      font-family: inherit;
      font-size: 0.95rem;
      margin-bottom: 14px;
      transition: border-color 0.2s;
    }
    input[type="text"]:focus, input[type="password"]:focus {
      outline: none;
      border-color: #38bdf8;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 20px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 0.95rem;
      text-decoration: none;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
      font-family: inherit;
    }
    .btn-huawei {
      background: #cf0a2c;
      color: #fff;
      box-shadow: 0 4px 15px rgba(207, 10, 44, 0.4);
      width: 100%;
      padding: 14px;
    }
    .btn-huawei:hover {
      background: #e60e33;
      transform: translateY(-1px);
    }
    .btn-primary {
      background: var(--accent-grad);
      color: #fff;
    }
    .btn-primary:hover {
      opacity: 0.95;
      transform: translateY(-1px);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
      margin-top: 16px;
    }
    .stat-box {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 14px;
      text-align: center;
    }
    .stat-val {
      font-size: 1.5rem;
      font-weight: 800;
      color: #fff;
    }
    .stat-lbl {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="badge ${isConnected ? 'badge-connected' : 'badge-disconnected'}">
        ${isConnected ? '🟢 HUAWEI CLOUD CONECTADO' : '🔴 HUAWEI CLOUD NO CONECTADO'}
      </div>
      <h1>Huawei Health Hub</h1>
      <p class="lead">Sincronización Directa con la Nube de Huawei (Sin Tablet ni Health Sync)</p>
    </header>

    ${message ? `<div class="alert alert-success">✅ ${message}</div>` : ''}

    <!-- SECCIÓN 1: ESTADO Y ACCIÓN RÁPIDA -->
    <div class="card">
      <h2>📡 Estado de la Conexión</h2>
      <p style="color: var(--text-muted); margin-bottom: 16px;">
        ${isConnected 
          ? `Tu cuenta de Huawei ID está enlazada correctamente. El bot tiene permiso para consultar tus datos biométricos directamente desde los servidores de Huawei. (Token expira en ${status.expiresRemainingMin} minutos y se auto-refresca de forma transparente).`
          : 'Para eliminar la tablet y Health Sync, vincula tu cuenta de Huawei ID una sola vez. Nuestro servidor en Render se encargará de extraer tus datos biométricos automáticamente.'}
      </p>

      ${isConfigured ? `
        <a href="/auth/huawei/login" class="btn btn-huawei">
          🔗 ${isConnected ? 'Reconectar / Renovar Permisos con Huawei ID' : 'Iniciar Sesión con Huawei ID y Autorizar Permisos'}
        </a>
      ` : `
        <div class="alert alert-info">
          ℹ️ Ingresa primero tu <strong>Client ID</strong> y <strong>Client Secret</strong> de Huawei Developer abajo para activar el botón de inicio de sesión con Huawei ID.
        </div>
      `}

      <div style="margin-top: 16px; display: flex; gap: 10px;">
        <form method="POST" action="/api/huawei/sync" style="display:inline;">
          <button type="submit" class="btn btn-primary" ${!isConnected ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
            ⚡ Sincronizar Ahora con Huawei Cloud
          </button>
        </form>
        <a href="https://t.me/AnalistaBotMiguelAcuBot" target="_blank" class="btn btn-secondary">
          🤖 Abrir Bot en Telegram
        </a>
      </div>
    </div>

    <!-- SECCIÓN 2: TELEMETRÍA DISPONIBLE -->
    <div class="card">
      <h2>📊 Datos Biométricos Almacenados</h2>
      <p style="color: var(--text-muted); font-size: 0.9rem;">Registros procesados y disponibles para análisis del Coach IA en Telegram:</p>
      <div class="stats-row">
        <div class="stat-box">
          <div class="stat-val">${workoutCount}</div>
          <div class="stat-lbl">Entrenamientos</div>
        </div>
        <div class="stat-box">
          <div class="stat-val">${sleepCount}</div>
          <div class="stat-lbl">Puntos Sueño</div>
        </div>
        <div class="stat-box">
          <div class="stat-val">${heartCount}</div>
          <div class="stat-lbl">Puntos Pulso</div>
        </div>
        <div class="stat-box">
          <div class="stat-val">${stepsCount}</div>
          <div class="stat-lbl">Puntos Pasos</div>
        </div>
        <div class="stat-box">
          <div class="stat-val">${oxygenCount}</div>
          <div class="stat-lbl">Puntos SpO2</div>
        </div>
      </div>
    </div>

    <!-- SECCIÓN 3: PERMISOS Y PASO A PASO -->
    <div class="card">
      <h2>📋 ¿Qué permisos debes habilitar? (Paso a Paso)</h2>
      
      <div class="step-item">
        <div class="step-num">1</div>
        <div class="step-text">
          <strong>En tu iPhone (Salud de Huawei):</strong>
          <p>Abre la app <em>Salud de Huawei</em> ➔ pestaña <strong>Yo</strong> ➔ <strong>Ajustes</strong> (o <em>Gestión de privacidad</em>) ➔ <strong>Compartir datos y autorización</strong> ➔ Habilita <strong>Huawei Health Kit</strong>.</p>
        </div>
      </div>

      <div class="step-item">
        <div class="step-num">2</div>
        <div class="step-text">
          <strong>Permisos que solicita esta aplicación:</strong>
          <div class="scope-list">
            <span class="scope-pill">🚶 Pasos & Distancia (step.read)</span>
            <span class="scope-pill">❤️ Frecuencia Cardíaca (heartrate.read)</span>
            <span class="scope-pill">🌙 Sueño REM & Profundo (sleep.read)</span>
            <span class="scope-pill">💨 Saturación SpO2 (oxygen.read)</span>
            <span class="scope-pill">🏃 Caminatas & Deportes (activity.read)</span>
            <span class="scope-pill">⚖️ Peso & Composición (heightweight.read)</span>
          </div>
        </div>
      </div>

      <div class="step-item">
        <div class="step-num">3</div>
        <div class="step-text">
          <strong>Credenciales de Huawei Developers (AppGallery Connect):</strong>
          <p>Crea un proyecto gratuito en <a href="https://developer.huawei.com/consumer/en/" target="_blank" style="color: #38bdf8;">HUAWEI Developers</a>, habilita el servicio <em>Health Kit</em> y copia tu App ID y Secret aquí:</p>
        </div>
      </div>

      <form method="POST" action="/api/huawei/credentials" style="margin-top: 14px;">
        <label for="clientId">Client ID (App ID de Huawei):</label>
        <input type="text" id="clientId" name="clientId" placeholder="Ej: 108923481" value="${creds.clientId}">

        <label for="clientSecret">Client Secret (Clave Secreta):</label>
        <input type="password" id="clientSecret" name="clientSecret" placeholder="Ej: 4f8a9e1234bc56..." value="${creds.clientSecret}">

        <label for="redirectUri">Redirect URI (URL de retorno configurada en Huawei Console):</label>
        <input type="text" id="redirectUri" name="redirectUri" value="${creds.redirectUri}">

        <button type="submit" class="btn btn-secondary" style="width: 100%;">
          💾 Guardar Credenciales de Huawei
        </button>
      </form>
    </div>

    <!-- SECCIÓN 4: ALTERNATIVA DIRECTA EN IPHONE -->
    <div class="card" style="border-color: rgba(56, 189, 248, 0.2);">
      <h2>💡 ¿Sabías que Health Sync ya está disponible en iPhone?</h2>
      <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 12px;">
        Si no quieres crear una cuenta de desarrollador en Huawei, <strong>Health Sync</strong> (de AppyHapps) ya fue lanzado en la <strong>App Store de iOS para iPhone</strong>.
      </p>
      <p style="color: var(--text-muted); font-size: 0.95rem;">
        Puedes instalar <em>Health Sync</em> directamente en tu iPhone, seleccionar origen <strong>Huawei Health</strong> y destino <strong>Google Drive</strong>. De esa manera eliminas por completo la tablet Android sin necesidad de configurar claves API.
      </p>
    </div>

  </div>
</body>
</html>`;
}

function createDashboardServer() {
  return http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    // 1. Render Healthcheck
    if (pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        status: 'online',
        bot: '@AnalistaBotMiguelAcuBot',
        huaweiConnection: huaweiClient.getConnectionStatus(),
        timestamp: new Date().toISOString()
      }));
    }

    // 2. Dashboard Web UI
    if (pathname === '/' || pathname === '/huawei') {
      const status = huaweiClient.getConnectionStatus();
      const message = parsedUrl.searchParams.get('msg');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(renderHtml(status, message));
    }

    // 3. Iniciar Login OAuth con Huawei
    if (pathname === '/auth/huawei/login') {
      const authUrl = huaweiClient.getAuthorizationUrl();
      if (!authUrl) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end('<h3>Error: Primero debes configurar tu Client ID y Client Secret de Huawei.</h3><a href="/">Volver</a>');
      }
      res.writeHead(302, { 'Location': authUrl });
      return res.end();
    }

    // 4. Callback OAuth de Huawei
    if (pathname === '/auth/huawei/callback') {
      const code = parsedUrl.searchParams.get('code');
      const error = parsedUrl.searchParams.get('error');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(`<h3>Error en autorización de Huawei: ${error}</h3><a href="/">Volver</a>`);
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end('<h3>No se recibió el código de autorización de Huawei.</h3><a href="/">Volver</a>');
      }

      try {
        await huaweiClient.exchangeCodeForTokens(code);
        // Disparar sincronización inicial de fondo
        huaweiSync.syncAll().catch(e => console.warn('[CallbackSync]', e.message));

        res.writeHead(302, { 'Location': '/?msg=¡Cuenta%20de%20Huawei%20conectada%20exitosamente!%20Iniciando%20sincronización.' });
        return res.end();
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(`<h3>Error canjeando credenciales: ${err.message}</h3><a href="/">Volver</a>`);
      }
    }

    // 5. Guardar Credenciales vía POST
    if (pathname === '/api/huawei/credentials' && method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        const params = new URLSearchParams(body);
        const clientId = params.get('clientId');
        const clientSecret = params.get('clientSecret');
        const redirectUri = params.get('redirectUri');

        huaweiClient.saveCredentials(clientId, clientSecret, redirectUri);
        res.writeHead(302, { 'Location': '/?msg=Credenciales%20de%20Huawei%20guardadas%20correctamente.' });
        return res.end();
      });
      return;
    }

    // 6. Sincronización Manual vía POST
    if (pathname === '/api/huawei/sync' && method === 'POST') {
      try {
        const result = await huaweiSync.syncAll();
        const msg = encodeURIComponent(result.message || 'Sincronización completada.');
        res.writeHead(302, { 'Location': `/?msg=${msg}` });
        return res.end();
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(`<h3>Error sincronizando con Huawei: ${err.message}</h3><a href="/">Volver</a>`);
      }
    }

    // 7. API de Estado JSON
    if (pathname === '/api/huawei/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(huaweiClient.getConnectionStatus()));
    }

    // 404 para otras rutas
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Ruta no encontrada');
  });
}

module.exports = {
  createDashboardServer
};
