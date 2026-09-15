const path = require('path');
const fs = require('fs');
require('dotenv').config();

const ROOT_DIR = path.resolve(__dirname, '../../');
const HEALTH_DATA_DIR = process.env.HEALTH_DATA_DIR 
  ? path.resolve(process.env.HEALTH_DATA_DIR) 
  : path.join(ROOT_DIR, 'health_data');

// Detect credentials across local development, Docker, and Render Secret Files
let resolvedKeyPath = path.join(ROOT_DIR, 'vertex_key.json');
if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  resolvedKeyPath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
} else if (fs.existsSync(path.join(ROOT_DIR, 'vertex_key.json'))) {
  resolvedKeyPath = path.join(ROOT_DIR, 'vertex_key.json');
} else if (fs.existsSync('/etc/secrets/vertex_key.json')) {
  resolvedKeyPath = '/etc/secrets/vertex_key.json';
} else if (process.env.VERTEX_KEY_JSON || process.env.GOOGLE_CREDENTIALS_JSON) {
  try {
    const rawJson = process.env.VERTEX_KEY_JSON || process.env.GOOGLE_CREDENTIALS_JSON;
    fs.writeFileSync(path.join(ROOT_DIR, 'vertex_key.json'), rawJson, 'utf8');
    resolvedKeyPath = path.join(ROOT_DIR, 'vertex_key.json');
  } catch (e) {
    console.warn('[Config] Error escribiendo credenciales desde variable de entorno:', e.message);
  }
}

const KEY_FILE_PATH = resolvedKeyPath;

let projectId = process.env.GOOGLE_CLOUD_PROJECT || 'inteligencia-508502';
if (fs.existsSync(KEY_FILE_PATH)) {
  try {
    const keyData = JSON.parse(fs.readFileSync(KEY_FILE_PATH, 'utf8'));
    if (keyData.project_id) {
      projectId = keyData.project_id;
    }
  } catch (err) {
    console.warn('Advertencia leyendo vertex_key.json:', err.message);
  }
}

module.exports = {
  ROOT_DIR,
  HEALTH_DATA_DIR,
  KEY_FILE_PATH,
  PROJECT_ID: projectId,
  LOCATION: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
  // Model setup: Gemini 3.8 Flash or Gemini 2.5 Flash
  MODEL_ID: process.env.GEMINI_MODEL_ID || 'gemini-2.5-flash',
  THINKING_LEVEL: process.env.THINKING_LEVEL || 'LOW', // LOW or MEDIUM for strict budget preservation
  TELEGRAM_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  GOOGLE_DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID || '12F-KkQbmeeJ1wm5p1XrBIBzbl8zqqF3G',
  // Huawei Health Kit Cloud configuration
  HUAWEI_CLIENT_ID: process.env.HUAWEI_CLIENT_ID || '',
  HUAWEI_CLIENT_SECRET: process.env.HUAWEI_CLIENT_SECRET || '',
  HUAWEI_REDIRECT_URI: process.env.HUAWEI_REDIRECT_URI || (process.env.RENDER_EXTERNAL_URL ? `${process.env.RENDER_EXTERNAL_URL}/auth/huawei/callback` : 'https://huawei-gt6.onrender.com/auth/huawei/callback'),
  HUAWEI_TOKENS_PATH: path.join(ROOT_DIR, 'data', 'huawei_tokens.json'),
  HUAWEI_CREDS_PATH: path.join(ROOT_DIR, 'data', 'huawei_creds.json'),
  USER_GOALS: {
    dailySteps: parseInt(process.env.GOAL_STEPS || '10000', 10),
    sleepHours: parseFloat(process.env.GOAL_SLEEP_HOURS || '8.0'),
    deepSleepTargetPct: 18.0,
    remSleepTargetPct: 22.0
  },
  USER_PROFILE: {
    name: process.env.USER_NAME || 'Miguel',
    birthYear: parseInt(process.env.USER_BIRTH_YEAR || '2006', 10),
    age: parseInt(process.env.USER_AGE || '20', 10)
  }
};
