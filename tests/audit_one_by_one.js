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

async function testAudits() {
  console.log('====================================================');
  console.log('🔬 AUDITORÍA PASO A PASO: COMANDO POR COMANDO');
  console.log('====================================================\n');

  // Common data
  const sleep = sleepEngine.getLatestNight();
  const prevSleep = sleepEngine.getPreviousNight();
  const historyStats = sleepEngine.getSleepHistoryStats();
  const heart = heartEngine.getLatestDayStats();
  const rhrTrend = heartEngine.getRhrTrend();
  const spikes = heartEngine.detectStressSpikes(heart ? heart.date : '');
  const act = activityEngine.getLatestDayStats();
  const readiness = readinessEngine.calculateReadiness();
  const presc = crossAnalytics.getDailyPrescription();
  const ans = crossAnalytics.getAutonomicBalance();
  const bio = crossAnalytics.getBiologicalFitnessAge();
  const acwr = crossAnalytics.calculateACWR();
  const workout = workoutEngine.getLatestWorkout();
  const weightRecords = dataLoader.loadWeightRecords();
  const latestWeight = weightRecords.length > 0 ? weightRecords[weightRecords.length - 1] : null;

  // 1. /comodormi
  console.log('\n--- COMANDO 1: /comodormi ---');
  const sleepPrompt = prompts.buildSleepPrompt(sleep, prevSleep, historyStats);
  const sleepAi = await geminiCoach.generateAnalysis(sleepPrompt);
  const sleepMsg = formatters.formatSleepSummary(sleep, sleepAi.text, historyStats);
  console.log(sleepMsg);

  // 2. /hoy
  console.log('\n--- COMANDO 2: /hoy ---');
  let hoyMsg = `📊 *TABLERO 360° DE HOY*\n\n`;
  hoyMsg += `🔋 *Batería Corporal:* *${readiness.score}/100* ${readiness.color} (${readiness.level})\n\n`;
  if (sleep) hoyMsg += `🌙 *Sueño:* ${sleep.totalSleepHours}h (Score: ${sleep.sleepScore}/100, REM: ${sleep.remPct}%, Profundo: ${sleep.deepPct}%)\n`;
  if (heart) hoyMsg += `❤️ *Corazón:* ${heart.avgBpm} bpm (RHR: ${heart.restingHeartRate} bpm | Pico: ${heart.maxBpm} bpm)\n`;
  if (act) hoyMsg += `🚶 *Pasos:* ${act.totalSteps.toLocaleString()} / ${act.targetSteps.toLocaleString()} (${act.distanceKm} km | ${act.activeCalories} kcal)\n`;
  hoyMsg += `\n🎯 *Veredicto del Coach:* ${readiness.advice}`;
  console.log(hoyMsg);

  // 3. /bateria
  console.log('\n--- COMANDO 3: /bateria ---');
  const readyPrompt = prompts.buildReadinessPrompt(readiness);
  const readyAi = await geminiCoach.generateAnalysis(readyPrompt);
  console.log(formatters.formatReadinessReport(readiness, readyAi.text));

  // 4. /prescripcion
  console.log('\n--- COMANDO 4: /prescripcion ---');
  const prescPrompt = prompts.buildPrescriptionPrompt(presc);
  const prescAi = await geminiCoach.generateAnalysis(prescPrompt);
  console.log(formatters.formatPrescriptionReport(presc, prescAi.text));

  // 5. /pregunta
  console.log('\n--- COMANDO 5: /pregunta ---');
  const question = 'Paso casi 8 horas sentado frente a la pantalla y tengo los tobillos algo hinchados, ¿qué debería hacer hoy?';
  const snapshot = {
    readiness,
    ultimoSueno: sleep,
    ultimoPulso: heart,
    ultimosPasos: act,
    balanceAutonomo: ans,
    edadBiologica: bio
  };
  const convPrompt = prompts.buildConversationPrompt(question, snapshot);
  const convAi = await geminiCoach.generateAnalysis(convPrompt);
  console.log(`Pregunta: "${question}"\n\nRespuesta:\n${convAi.text}`);

  // 6. /acwr
  console.log('\n--- COMANDO 6: /acwr ---');
  console.log(formatters.formatAcwrReport(acwr));

  // 7. /actividad
  console.log('\n--- COMANDO 7: /actividad ---');
  if (workout) {
    console.log(formatters.formatWorkoutReport(workout, 'Sesión registrada evaluada para ruptura de sedentarismo.'));
  } else {
    console.log('No hay entrenamientos recientes.');
  }

  // 8. /recuperacion_entreno
  console.log('\n--- COMANDO 8: /recuperacion_entreno ---');
  if (workout) {
    console.log(`• Última actividad: ${workout.type} (${workout.datetime})`);
    console.log(`• Horas descanso recomendadas: ${workout.recoveryHoursTotal}h`);
    console.log(`• Estado actual: ${workout.recoveryStatus}`);
  }

  // 9. /historial_actividades
  console.log('\n--- COMANDO 9: /historial_actividades ---');
  const history = workoutEngine.getWorkoutHistory(3);
  history.forEach((w, i) => console.log(`${i+1}. ${w.type} - ${w.datetime} (${w.durationMinutes} min, ${w.calories} kcal)`));

  // 10. /sistema_autonomo
  console.log('\n--- COMANDO 10: /sistema_autonomo ---');
  console.log(formatters.formatAutonomicReport(ans, 'Tono vagal preservado; dip nocturno adecuado. Mantén pausas para evitar sobrecarga simpática.'));

  // 11. /edad_biologica
  console.log('\n--- COMANDO 11: /edad_biologica ---');
  console.log(formatters.formatBiologicalAgeReport(bio, 'Tu edad biológica se beneficia de tu pulso en reposo eficiente, pero el sedentarismo es el factor que más te resta. Camina diariamente para blindar tu salud arterial.'));

  // 12. /corazon
  console.log('\n--- COMANDO 12: /corazon ---');
  console.log(formatters.formatHeartReport(heart, rhrTrend, 'Pulso en reposo estable de 45 bpm. Excelente eficiencia miocárdica.'));

  // 13. /frecuencia_reposo
  console.log('\n--- COMANDO 13: /frecuencia_reposo ---');
  console.log(`RHR Actual: ${rhrTrend.latestRhr} bpm | Media 7d: ${rhrTrend.recent7DaysAvgRhr} bpm`);

  // 14. /zonas
  console.log('\n--- COMANDO 14: /zonas ---');
  console.log('Zonas Karvonen personalizadas:', heart.karvonenZones);

  // 15. /picos_estres
  console.log('\n--- COMANDO 15: /picos_estres ---');
  console.log(`Picos de estrés detectados: ${spikes.length}`);

  // 16. /fases
  console.log('\n--- COMANDO 16: /fases ---');
  console.log(formatters.formatSleepSummary(sleep, ''));

  // 17. /ciclos
  console.log('\n--- COMANDO 17: /ciclos ---');
  console.log(`Ciclos: ${sleep.cyclesCount}, Despertar: ${sleep.lastStage}`);

  // 18. /eficiencia
  console.log('\n--- COMANDO 18: /eficiencia ---');
  console.log(`Eficiencia: ${sleep.efficiencyPct}% (${sleep.totalSleepHours}h / ${sleep.inBedHours}h)`);

  // 19. /deuda_sueno
  console.log('\n--- COMANDO 19: /deuda_sueno ---');
  const debt = sleepEngine.calculateSleepDebt(8.0);
  console.log(`Deuda 7d: ${debt.totalDebtHours}h (${debt.debtStatus})`);

  // 20. /cronotipo
  console.log('\n--- COMANDO 20: /cronotipo ---');
  const chrono = sleepEngine.determineChronotype();
  console.log(`Cronotipo: ${chrono.chronotype} (Punto medio de descanso: ${sleep.sleepMidpoint})`);

  // 21. /apnea_oxigeno
  console.log('\n--- COMANDO 21: /apnea_oxigeno ---');
  const oxyCorr = oxygenEngine.correlateWithSleep(sleep);
  console.log(`SpO2 Medio al dormir: ${oxyCorr.avgSleepSpo2}%, Caídas <95%: ${oxyCorr.desaturationEvents}`);

  // 22. /pasos
  console.log('\n--- COMANDO 22: /pasos ---');
  console.log(formatters.formatStepsReport(act));

  // 23. /peso
  console.log('\n--- COMANDO 23: /peso ---');
  console.log(formatters.formatWeightReport(latestWeight));

  // 24. /sedentarismo
  console.log('\n--- COMANDO 24: /sedentarismo ---');
  console.log(`Horas sedentarias diurnas: ${act.sedentaryDaytimeHours}h | Racha continua máxima: ${act.maxSedentaryStreakHours}h`);

  // 25. /semanal
  console.log('\n--- COMANDO 25: /semanal ---');
  const stepSum = activityEngine.getWeeklySummary();
  console.log(`Pasos semanales: ${stepSum.totalSteps} (Media: ${stepSum.avgDailySteps}/día)`);

  console.log('\n====================================================');
  console.log('✅ AUDITORÍA DE 25 COMANDOS COMPLETADA CON ÉXITO');
  console.log('====================================================');
}

testAudits().catch(e => console.error('ERROR EN AUDITORÍA:', e));
