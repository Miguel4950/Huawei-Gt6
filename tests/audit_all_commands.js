const sleepEngine = require('../src/analytics/sleepEngine');
const heartEngine = require('../src/analytics/heartEngine');
const oxygenEngine = require('../src/analytics/oxygenEngine');
const activityEngine = require('../src/analytics/activityEngine');
const workoutEngine = require('../src/analytics/workoutEngine');
const readinessEngine = require('../src/analytics/readinessEngine');
const crossAnalytics = require('../src/analytics/crossAnalytics');
const geminiCoach = require('../src/ai/geminiCoach');
const prompts = require('../src/ai/prompts');
const formatters = require('../src/bot/formatters');
const dataLoader = require('../src/data/dataLoader');

async function auditCommands() {
  console.log('================================================================');
  console.log('🔍 INICIANDO AUDITORÍA COMANDO POR COMANDO CON DATOS REALES');
  console.log('================================================================\n');

  // 1. /comodormi
  console.log('=== 1. AUDITANDO /comodormi ===');
  const sleep = sleepEngine.getLatestNight();
  const prevSleep = sleepEngine.getPreviousNight();
  const historyStats = sleepEngine.getSleepHistoryStats();
  const sleepPrompt = prompts.buildSleepPrompt(sleep, prevSleep, historyStats);
  const sleepAi = await geminiCoach.generateAnalysis(sleepPrompt);
  const sleepOutput = formatters.formatSleepSummary(sleep, sleepAi.text, historyStats);
  console.log(sleepOutput);
  console.log('\n----------------------------------------------------------------\n');

  // 2. /hoy
  console.log('=== 2. AUDITANDO /hoy ===');
  const heart = heartEngine.getLatestDayStats();
  const act = activityEngine.getLatestDayStats();
  const readiness = readinessEngine.calculateReadiness();
  let hoyOutput = `📊 *TABLERO 360° DE HOY*\n\n`;
  hoyOutput += `🔋 *Batería Corporal:* *${readiness.score}/100* ${readiness.color} (${readiness.level})\n\n`;
  if (sleep) hoyOutput += `🌙 *Sueño:* ${sleep.totalSleepHours}h (Score: ${sleep.sleepScore}/100, REM: ${sleep.remPct}%, Profundo: ${sleep.deepPct}%)\n`;
  if (heart) hoyOutput += `❤️ *Corazón:* ${heart.avgBpm} bpm (RHR: ${heart.restingHeartRate} bpm | Pico: ${heart.maxBpm} bpm)\n`;
  if (act) hoyOutput += `🚶 *Pasos:* ${act.totalSteps.toLocaleString()} / ${act.targetSteps.toLocaleString()} (${act.distanceKm} km | ${act.activeCalories} kcal)\n`;
  hoyOutput += `\n🎯 *Veredicto del Coach:* ${readiness.advice}`;
  console.log(hoyOutput);
  console.log('\n----------------------------------------------------------------\n');

  // 3. /bateria (readiness)
  console.log('=== 3. AUDITANDO /bateria (/readiness) ===');
  const readyPrompt = prompts.buildReadinessPrompt(readiness);
  const readyAi = await geminiCoach.generateAnalysis(readyPrompt);
  const readyOutput = formatters.formatReadinessReport(readiness, readyAi.text);
  console.log(readyOutput);
  console.log('\n----------------------------------------------------------------\n');

  // 4. /prescripcion
  console.log('=== 4. AUDITANDO /prescripcion (/plan_hoy) ===');
  const presc = crossAnalytics.getDailyPrescription();
  const prescPrompt = prompts.buildPrescriptionPrompt(presc);
  const prescAi = await geminiCoach.generateAnalysis(prescPrompt);
  const prescOutput = formatters.formatPrescriptionReport(presc, prescAi.text);
  console.log(prescOutput);
  console.log('\n----------------------------------------------------------------\n');

  // 5. /pregunta (consulta libre)
  console.log('=== 5. AUDITANDO /pregunta ===');
  const testQuestion = 'Trabajo sentado todo el día y siento las piernas pesadas, ¿qué me recomiendas hacer hoy con mis datos?';
  const snapshot = {
    ultimoSueno: sleep,
    ultimoPulso: heart,
    ultimosPasos: act,
    ultimoEntrenamiento: workoutEngine.getLatestWorkout(),
    readiness,
    prescripcion: presc,
    balanceAutonomo: crossAnalytics.getAutonomicBalance(),
    edadBiologica: crossAnalytics.getBiologicalFitnessAge(),
    cargaAcwr: crossAnalytics.calculateACWR()
  };
  const convPrompt = prompts.buildConversationPrompt(testQuestion, snapshot);
  const convAi = await geminiCoach.generateAnalysis(convPrompt);
  console.log(`Pregunta: "${testQuestion}"\n`);
  console.log(convAi.text);
  console.log('\n----------------------------------------------------------------\n');

  // 6. /acwr
  console.log('=== 6. AUDITANDO /acwr ===');
  const acwrData = crossAnalytics.calculateACWR();
  const acwrOutput = formatters.formatAcwrReport(acwrData);
  console.log(acwrOutput);
  console.log('\n----------------------------------------------------------------\n');

  // 7. /actividad
  console.log('=== 7. AUDITANDO /actividad ===');
  const workout = workoutEngine.getLatestWorkout();
  if (workout) {
    const wPrompt = prompts.buildWorkoutPrompt(workout);
    const wAi = await geminiCoach.generateAnalysis(wPrompt);
    const workoutOutput = formatters.formatWorkoutReport(workout, wAi.text);
    console.log(workoutOutput);
  } else {
    console.log('No hay entrenamientos registrados.');
  }
  console.log('\n----------------------------------------------------------------\n');

  // 8. /sistema_autonomo
  console.log('=== 8. AUDITANDO /sistema_autonomo ===');
  const ans = crossAnalytics.getAutonomicBalance();
  const ansPrompt = prompts.buildAutonomicPrompt(ans);
  const ansAi = await geminiCoach.generateAnalysis(ansPrompt);
  const ansOutput = formatters.formatAutonomicReport(ans, ansAi.text);
  console.log(ansOutput);
  console.log('\n----------------------------------------------------------------\n');

  // 9. /edad_biologica
  console.log('=== 9. AUDITANDO /edad_biologica ===');
  const bio = crossAnalytics.getBiologicalFitnessAge();
  const bioPrompt = prompts.buildBiologicalAgePrompt(bio);
  const bioAi = await geminiCoach.generateAnalysis(bioPrompt);
  const bioOutput = formatters.formatBiologicalAgeReport(bio, bioAi.text);
  console.log(bioOutput);
  console.log('\n----------------------------------------------------------------\n');

  // 10. /corazon
  console.log('=== 10. AUDITANDO /corazon ===');
  const rhrTrend = heartEngine.getRhrTrend();
  const spikes = heartEngine.detectStressSpikes(heart ? heart.date : '');
  const heartPrompt = prompts.buildHeartPrompt(heart, rhrTrend, spikes);
  const heartAi = await geminiCoach.generateAnalysis(heartPrompt);
  const heartOutput = formatters.formatHeartReport(heart, rhrTrend, heartAi.text);
  console.log(heartOutput);
  console.log('\n----------------------------------------------------------------\n');

  // 11. /pasos
  console.log('=== 11. AUDITANDO /pasos ===');
  const stepsOutput = formatters.formatStepsReport(act);
  console.log(stepsOutput);
  console.log('\n----------------------------------------------------------------\n');

  // 12. /peso
  console.log('=== 12. AUDITANDO /peso ===');
  const weightRecords = dataLoader.loadWeightRecords();
  const weightOutput = formatters.formatWeightReport(weightRecords.length > 0 ? weightRecords[weightRecords.length - 1] : null);
  console.log(weightOutput);
  console.log('\n----------------------------------------------------------------\n');

  // 13. /sedentarismo
  console.log('=== 13. AUDITANDO /sedentarismo ===');
  console.log(`Horas sedentarias diurnas: ${act.sedentaryDaytimeHours}h | Racha continua máxima: ${act.maxSedentaryStreakHours}h`);
  console.log('\n----------------------------------------------------------------\n');

  // 14. /semanal
  console.log('=== 14. AUDITANDO /semanal ===');
  const stepSummary = activityEngine.getWeeklySummary();
  const debt = sleepEngine.calculateSleepDebt(8.0);
  const summaryPayload = {
    diasAnalizados: stepSummary.daysAnalyzed,
    pasosTotales: stepSummary.totalSteps,
    pasosPromedioDiario: stepSummary.avgDailySteps,
    pulsoReposoPromedio7d: rhrTrend.recent7DaysAvgRhr,
    horasSuenoPromedioDiario: debt.avgDailySleepHours,
    deudaSuenoAcumulada: debt.totalDebtHours
  };
  const weeklyPrompt = prompts.buildWeeklyPrompt(summaryPayload);
  const weeklyAi = await geminiCoach.generateAnalysis(weeklyPrompt);
  console.log(weeklyAi.text);
  console.log('\n================================================================\n');
}

auditCommands().catch(err => {
  console.error('ERROR EN AUDITORÍA:', err);
});
