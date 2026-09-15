const fs = require('fs');
const path = require('path');
const https = require('https');
const config = require('../config/config');

const HUAWEI_OAUTH_AUTH_URL = 'https://oauth-login.cloud.huawei.com/oauth2/v3/authorize';
const HUAWEI_OAUTH_TOKEN_URL = 'https://oauth-login.cloud.huawei.com/oauth2/v3/token';
const HUAWEI_API_BASE = 'https://health-api.cloud.huawei.com/healthkit/v2';

const REQUIRED_SCOPES = [
  'https://www.huawei.com/healthkit/step.read',
  'https://www.huawei.com/healthkit/heartrate.read',
  'https://www.huawei.com/healthkit/sleep.read',
  'https://www.huawei.com/healthkit/oxygen.read',
  'https://www.huawei.com/healthkit/activity.read',
  'https://www.huawei.com/healthkit/heightweight.read'
];

class HuaweiClient {
  constructor() {
    this.tokensPath = config.HUAWEI_TOKENS_PATH;
    this.credsPath = config.HUAWEI_CREDS_PATH;
    this.ensureDataDir();
  }

  ensureDataDir() {
    const dir = path.dirname(this.tokensPath);
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
    }
  }

  getCredentials() {
    let clientId = config.HUAWEI_CLIENT_ID;
    let clientSecret = config.HUAWEI_CLIENT_SECRET;
    let redirectUri = config.HUAWEI_REDIRECT_URI;

    if ((!clientId || !clientSecret) && fs.existsSync(this.credsPath)) {
      try {
        const creds = JSON.parse(fs.readFileSync(this.credsPath, 'utf8'));
        clientId = clientId || creds.clientId;
        clientSecret = clientSecret || creds.clientSecret;
        redirectUri = creds.redirectUri || redirectUri;
      } catch (e) {}
    }

    return { clientId: clientId || '', clientSecret: clientSecret || '', redirectUri };
  }

  saveCredentials(clientId, clientSecret, redirectUri) {
    this.ensureDataDir();
    const data = {
      clientId: (clientId || '').trim(),
      clientSecret: (clientSecret || '').trim(),
      redirectUri: (redirectUri || config.HUAWEI_REDIRECT_URI).trim(),
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(this.credsPath, JSON.stringify(data, null, 2), 'utf8');
    return data;
  }

  getAuthorizationUrl() {
    const { clientId, redirectUri } = this.getCredentials();
    if (!clientId) return null;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: REQUIRED_SCOPES.join(' '),
      access_type: 'offline',
      display: 'page'
    });

    return `${HUAWEI_OAUTH_AUTH_URL}?${params.toString()}`;
  }

  getStoredTokens() {
    if (!fs.existsSync(this.tokensPath)) return null;
    try {
      return JSON.parse(fs.readFileSync(this.tokensPath, 'utf8'));
    } catch (e) {
      return null;
    }
  }

  saveTokens(tokenData) {
    this.ensureDataDir();
    const now = Date.now();
    const record = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || (this.getStoredTokens() ? this.getStoredTokens().refreshToken : null),
      expiresIn: tokenData.expires_in,
      expiresAt: now + (tokenData.expires_in * 1000),
      scope: tokenData.scope,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(this.tokensPath, JSON.stringify(record, null, 2), 'utf8');
    return record;
  }

  async exchangeCodeForTokens(code) {
    const { clientId, clientSecret, redirectUri } = this.getCredentials();
    if (!clientId || !clientSecret) {
      throw new Error('Faltan credenciales de Huawei (Client ID o Client Secret).');
    }

    const bodyParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code.trim(),
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri
    });

    const res = await this.postRequest(HUAWEI_OAUTH_TOKEN_URL, bodyParams.toString(), {
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    if (res.error) {
      throw new Error(`Error canjeando código: ${res.error_description || res.error}`);
    }

    return this.saveTokens(res);
  }

  async refreshTokens() {
    const tokens = this.getStoredTokens();
    if (!tokens || !tokens.refreshToken) {
      throw new Error('No existe refresh_token almacenado para Huawei Cloud.');
    }

    const { clientId, clientSecret } = this.getCredentials();
    if (!clientId || !clientSecret) {
      throw new Error('Faltan credenciales de Huawei (Client ID o Client Secret).');
    }

    const bodyParams = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
      client_id: clientId,
      client_secret: clientSecret
    });

    const res = await this.postRequest(HUAWEI_OAUTH_TOKEN_URL, bodyParams.toString(), {
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    if (res.error) {
      throw new Error(`Error refrescando token: ${res.error_description || res.error}`);
    }

    return this.saveTokens(res);
  }

  async getValidAccessToken() {
    let tokens = this.getStoredTokens();
    if (!tokens) {
      throw new Error('No hay cuenta de Huawei vinculada. Conecta tu cuenta desde la interfaz web o /huawei.');
    }

    // Si expira en menos de 2 minutos, refrescarlo preventivamente
    const TWO_MINUTES_MS = 2 * 60 * 1000;
    if (Date.now() > (tokens.expiresAt - TWO_MINUTES_MS)) {
      tokens = await this.refreshTokens();
    }

    return tokens.accessToken;
  }

  async apiRequest(endpoint, options = {}) {
    const accessToken = await this.getValidAccessToken();
    const url = `${HUAWEI_API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (options.method === 'POST') {
      return this.postRequest(url, JSON.stringify(options.body || {}), headers);
    } else {
      return this.getRequest(url, headers);
    }
  }

  // Métodos HTTP básicos usando https nativo de Node.js (cero dependencias externas)
  getRequest(urlStr, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(urlStr);
      const req = https.request({
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'GET',
        headers
      }, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(raw);
            resolve(parsed);
          } catch (e) {
            resolve({ raw, statusCode: res.statusCode });
          }
        });
      });
      req.on('error', reject);
      req.end();
    });
  }

  postRequest(urlStr, data, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(urlStr);
      const req = https.request({
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Length': Buffer.byteLength(data),
          ...headers
        }
      }, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(raw);
            resolve(parsed);
          } catch (e) {
            resolve({ raw, statusCode: res.statusCode });
          }
        });
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  getConnectionStatus() {
    const creds = this.getCredentials();
    const tokens = this.getStoredTokens();
    const isConfigured = Boolean(creds.clientId && creds.clientSecret);
    const isConnected = Boolean(tokens && tokens.accessToken && (Date.now() < tokens.expiresAt || tokens.refreshToken));

    let expiresRemainingMin = 0;
    if (tokens && tokens.expiresAt) {
      expiresRemainingMin = Math.max(0, Math.round((tokens.expiresAt - Date.now()) / (60 * 1000)));
    }

    return {
      isConfigured,
      isConnected,
      clientId: creds.clientId ? `${creds.clientId.slice(0, 4)}••••${creds.clientId.slice(-4)}` : '',
      redirectUri: creds.redirectUri,
      expiresRemainingMin,
      hasRefreshToken: Boolean(tokens && tokens.refreshToken),
      lastUpdated: tokens ? tokens.updatedAt : null,
      authUrl: isConfigured ? this.getAuthorizationUrl() : null,
      requiredScopes: REQUIRED_SCOPES
    };
  }
}

module.exports = new HuaweiClient();
