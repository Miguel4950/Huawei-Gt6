require('dotenv').config();
const HealthTelegramBot = require('./src/bot/telegramBot');
const config = require('./src/config/config');

const token = process.env.TELEGRAM_BOT_TOKEN || config.TELEGRAM_TOKEN;

if (!token) {
  console.error('❌ ERROR: TELEGRAM_BOT_TOKEN no está definido.');
  console.error('Por favor define la variable en .env o como variable de entorno.');
  process.exit(1);
}

const bot = new HealthTelegramBot(token);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Servidor] Deteniendo bot de forma segura...');
  bot.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Servidor] Señal SIGTERM recibida. Deteniendo bot...');
  bot.stop();
  process.exit(0);
});

bot.start();
