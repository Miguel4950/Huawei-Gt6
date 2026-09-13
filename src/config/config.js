const path = require('path');
const fs = require('fs');
require('dotenv').config();

const ROOT_DIR = path.resolve(__dirname, '../../');
const HEALTH_DATA_DIR = process.env.HEALTH_DATA_DIR 
  ? path.resolve(process.env.HEALTH_DATA_DIR) 
  : path.join(ROOT_DIR, 'health_data');

const KEY_FILE_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS 
  ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS) 
  : path.join(ROOT_DIR, 'vertex_key.json');

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
  USER_GOALS: {
    dailySteps: parseInt(process.env.GOAL_STEPS || '10000', 10),
    sleepHours: parseFloat(process.env.GOAL_SLEEP_HOURS || '8.0'),
    deepSleepTargetPct: 18.0,
    remSleepTargetPct: 22.0
  },
  USER_PROFILE: {
    name: process.env.USER_NAME || 'Miguel',
    birthYear: parseInt(process.env.USER_BIRTH_YEAR || '2004', 10),
    age: parseInt(process.env.USER_AGE || '21', 10)
  }
};
