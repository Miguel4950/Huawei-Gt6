const assert = require('assert');
const dataLoader = require('../src/data/dataLoader');
const sleepEngine = require('../src/analytics/sleepEngine');
const heartEngine = require('../src/analytics/heartEngine');
const oxygenEngine = require('../src/analytics/oxygenEngine');
const activityEngine = require('../src/analytics/activityEngine');
const workoutEngine = require('../src/analytics/workoutEngine');
const readinessEngine = require('../src/analytics/readinessEngine');
const prompts = require('../src/ai/prompts');
const geminiCoach = require('../src/ai/geminiCoach');
const formatters = require('../src/bot/formatters');

async function run20TestSuite() {
  console.log('====================================================');
  console.log('🧪 INICIANDO SUITE DE 20 PRUEBAS EXHAUSTIVAS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      passed++;
      console.log(`✅ [TEST ${String(passed + failed).padStart(2, '0')}] PASSED: ${name}`);
    } catch (err) {
      failed++;
      console.error(`❌ [TEST ${String(passed + failed).padStart(2, '0')}] FAILED: ${name}`);
      console.error('   Motivo:', err.message);
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      passed++;
      console.log(`✅ [TEST ${String(passed + failed).padStart(2, '0')}] PASSED: ${name}`);
    } catch (err) {
      failed++;
      console.error(`❌ [TEST ${String(passed + failed).padStart(2, '0')}] FAILED: ${name}`);
      console.error('   Motivo:', err.message);
    }
  }

  // 1. Duración y eficiencia de sueño
  test('01. Cálculo exacto de duración y eficiencia de sueño', () => {
    const sleep = sleepEngine.getLatestNight();
    assert.ok(sleep, 'Debe existir la última noche de sueño');
    assert.ok(sleep.totalSleepHours > 4, 'Horas de sueño deben ser mayores a 4h');
    assert.ok(sleep.efficiencyPct >= 70 && sleep.efficiencyPct <= 100, 'Eficiencia debe estar entre 70% y 100%');
  });

  // 2. Fases de sueño
  test('02. Desglose porcentual coherente de fases de sueño (Deep, REM, Light, Awake)', () => {
    const sleep = sleepEngine.getLatestNight();
    const sumPct = sleep.deepPct + sleep.remPct + sleep.lightPct;
    assert.ok(Math.abs(sumPct - 100) < 1.0, 'La suma de fases dormidas debe aproximarse al 100%');
    assert.ok(sleep.remPct > 10, 'Fase REM debe ser superior a 10%');
    assert.ok(sleep.deepPct > 5, 'Fase Profunda debe ser superior a 5%');
  });

  // 3. Ciclos ultradianos de 90 minutos
  test('03. Identificación de ciclos ultradianos de ~90 min y fase al despertar', () => {
    const sleep = sleepEngine.getLatestNight();
    assert.ok(sleep.cyclesCount >= 3.0, 'Debe haber al menos 3 ciclos completos de sueño');
    assert.strictEqual(typeof sleep.wokenUpInDeep, 'boolean', 'wokenUpInDeep debe ser booleano');
  });

  // 4. Latencia de sueño
  test('04. Detección y cálculo de latencia de inicio de sueño', () => {
    const sleep = sleepEngine.getLatestNight();
    assert.strictEqual(typeof sleep.latencySeconds, 'number', 'Latencia en segundos debe ser numérico');
    assert.ok(sleep.latencySeconds >= 0, 'La latencia no puede ser negativa');
  });

  // 5. Deuda acumulada de sueño en 7 días
  test('05. Cálculo de deuda acumulada de sueño vs objetivo de 8 horas', () => {
    const debt = sleepEngine.calculateSleepDebt(8.0);
    assert.ok(debt.daysCount > 0, 'Debe analizar al menos 1 día');
    assert.strictEqual(typeof debt.totalDebtHours, 'number', 'totalDebtHours debe ser un número');
    assert.ok(debt.avgDailySleepHours > 0, 'Promedio diario de sueño debe ser positivo');
  });

  // 6. Cronotipo circadiano
  test('06. Análisis de regularidad circadiana y determinación de cronotipo', () => {
    const chrono = sleepEngine.determineChronotype();
    assert.ok(['Alondra (Madrugador)', 'Búho (Noctámbulo)', 'Intermedio'].includes(chrono.chronotype), 'Cronotipo debe ser válido');
    assert.ok(chrono.sessionsSampled > 0, 'Debe haber sesiones evaluadas');
  });

  // 7. Frecuencia cardíaca en reposo nocturna (RHR)
  test('07. Detección precisa de la Frecuencia Cardíaca en Reposo (RHR) nocturna', () => {
    const stats = heartEngine.getLatestDayStats();
    assert.ok(stats, 'Debe existir estadísticas cardíacas');
    assert.ok(stats.restingHeartRate >= 40 && stats.restingHeartRate <= 90, 'RHR debe estar en rango fisiológico (40-90 bpm)');
  });

  // 8. Estadísticas diarias de frecuencia cardíaca (Min, Media, Máx)
  test('08. Estadísticas diarias de frecuencia cardíaca (Min < Media < Máx)', () => {
    const stats = heartEngine.getLatestDayStats();
    assert.ok(stats.minBpm <= stats.avgBpm, 'Min BPM debe ser <= Avg BPM');
    assert.ok(stats.avgBpm <= stats.maxBpm, 'Avg BPM debe ser <= Max BPM');
  });

  // 9. Zonas de entrenamiento cardiovascular Z1-Z5
  test('09. Clasificación de lecturas en Zonas Cardíacas Z1 a Z5', () => {
    const stats = heartEngine.getLatestDayStats();
    const z = stats.zones;
    const totalZonePct = z.z1Pct + z.z2Pct + z.z3Pct + z.z4Pct + z.z5Pct;
    assert.ok(Math.abs(totalZonePct - 100) < 1.0, 'La suma de zonas debe sumar ~100%');
    assert.ok(z.z1Pct > 0, 'Zona 1 (reposo) debe tener porcentaje positivo');
  });

  // 10. Detección de picos de estrés (FC alta con pasos = 0)
  test('10. Detección de picos de estrés o taquicardia postural', () => {
    const days = heartEngine.getDaysList();
    const latestDay = days[days.length - 1];
    const spikes = heartEngine.detectStressSpikes(latestDay);
    assert.ok(Array.isArray(spikes), 'Spikes debe retornar un arreglo');
  });

  // 11. Saturación de Oxígeno (SpO2) y caídas de saturación
  test('11. Muestreo de SpO2 y detección de desaturaciones (<95% y <90%)', () => {
    const oxy = oxygenEngine.getLatestDayStats();
    assert.ok(oxy, 'Debe existir registro de SpO2');
    assert.ok(oxy.avgSpo2 >= 90 && oxy.avgSpo2 <= 100, 'SpO2 promedio debe estar en rango 90-100%');
    assert.strictEqual(typeof oxy.dropsBelow95Count, 'number', 'dropsBelow95 debe ser un número');
  });

  // 12. Correlación de oxígeno con ventana de sueño
  test('12. Correlación cruzada entre SpO2 y la ventana de sueño nocturno', () => {
    const sleep = sleepEngine.getLatestNight();
    const corr = oxygenEngine.correlateWithSleep(sleep);
    assert.ok(corr, 'Debe existir correlación de oxígeno en sueño');
    assert.ok(corr.sampleCount > 0, 'Debe haber muestras en la ventana de sueño');
    assert.ok(['Excelente', 'Buena', 'Interrupciones detectadas'].includes(corr.breathingStability), 'Estabilidad debe tener etiqueta válida');
  });

  // 13. Agregación horaria de pasos y calorías activas
  test('13. Agregación de pasos diarios, distancia en km y calorías activas', () => {
    const act = activityEngine.getLatestDayStats();
    assert.ok(act, 'Debe haber estadísticas de actividad');
    assert.ok(act.totalSteps >= 0, 'Los pasos deben ser positivos');
    assert.ok(act.distanceKm >= 0, 'La distancia debe ser positiva');
    assert.ok(act.activeCalories >= 0, 'Las calorías activas deben ser positivas');
    assert.ok(act.peakHour.length > 0, 'Debe calcular la hora pico');
  });

  // 14. Detección de horas sedentarias continuas
  test('14. Identificación de bloques de inactividad / sedentarismo continuo', () => {
    const act = activityEngine.getLatestDayStats();
    assert.strictEqual(typeof act.sedentaryDaytimeHours, 'number', 'Horas sedentarias debe ser numérico');
    assert.strictEqual(typeof act.maxSedentaryStreakHours, 'number', 'Racha máxima sedentaria debe ser numérico');
  });

  // 15. Procesamiento de sesiones de entrenamiento/workout
  test('15. Análisis de sesiones deportivas y horas de recuperación', () => {
    const w = workoutEngine.getLatestWorkout();
    assert.ok(w, 'Debe cargar el último entrenamiento exportado');
    assert.ok(w.durationMinutes >= 0, 'La duración debe ser positiva');
    assert.ok(['Baja', 'Moderada', 'Alta', 'Muy Alta'].includes(w.intensity), 'La intensidad debe ser válida');
    assert.ok(w.recoveryHours >= 12, 'Las horas de recuperación deben ser de al menos 12h');
  });

  // 16. Algoritmo de Score de Recuperación / Readiness (0-100)
  test('16. Cálculo del Score de Recuperación / Body Battery (0-100)', () => {
    const readiness = readinessEngine.calculateReadiness();
    assert.ok(readiness.score >= 0 && readiness.score <= 100, 'Readiness score debe estar entre 0 y 100');
    assert.ok(['ÓPTIMO', 'MODERADO', 'BAJO (FATIGA)'].includes(readiness.level), 'Nivel de recuperación debe ser válido');
    assert.ok(['🟢', '🟡', '🔴'].includes(readiness.color), 'Color de semáforo debe ser válido');
  });

  // 17. Correlación de ejercicio diurno y sueño posterior
  test('17. Análisis del cruce ejercicio vs arquitectura del sueño posterior', () => {
    const corr = readinessEngine.correlateExerciseAndSleep();
    assert.ok(corr.latestNight, 'Debe incluir la última noche');
    assert.ok(corr.latestWorkout, 'Debe incluir la última sesión de ejercicio');
  });

  // 18. Tendencias y comparativa semanal
  test('18. Cálculo de comparativa semanal y variaciones porcentuales', () => {
    const rhrTrend = heartEngine.getRhrTrend();
    assert.ok(rhrTrend.trend.length > 0, 'Debe haber historial de días evaluados');
    assert.ok(rhrTrend.recent7DaysAvgRhr > 0, 'El promedio de 7 días de RHR debe ser mayor a cero');
  });

  // 19. Optimización de tokens para el presupuesto de $5 USD/mes (<600 tokens)
  test('19. Verificación de compresión del payload para Gemini (< 600 tokens de entrada)', () => {
    const sleep = sleepEngine.getLatestNight();
    const prev = sleepEngine.getPreviousNight();
    const prompt = prompts.buildSleepPrompt(sleep, prev);
    // Rough token estimate: ~4 chars per token
    const tokenEst = Math.round(prompt.length / 4);
    assert.ok(tokenEst < 600, `El prompt debe ser menor a 600 tokens (estimado actual: ${tokenEst} tokens)`);
  });

  // 20. Verificación de conexión y respuesta estructurada con Gemini 3.8 Flash
  await testAsync('20. Conectividad real con Gemini 3.8 Flash (Thinking MEDIUM) y control presupuestario', async () => {
    const sleep = sleepEngine.getLatestNight();
    const prev = sleepEngine.getPreviousNight();
    const prompt = prompts.buildSleepPrompt(sleep, prev);

    const result = await geminiCoach.generateAnalysis(prompt, { model: 'gemini-3.8-flash', thinkingLevel: 'MEDIUM' });
    assert.ok(result.text && result.text.length > 50, 'Gemini debe devolver una respuesta sustanciosa');
    assert.ok(result.tokensEstimate.total < 1500, 'Los tokens totales por consulta deben ser menores a 1500');

    const costSummary = geminiCoach.getCostSummary();
    assert.ok(costSummary.totalCostUsd < 0.005, 'El costo de la consulta debe ser menor a medio centavo de dólar');
  });

  console.log('\n====================================================');
  console.log(`📊 RESULTADO FINAL: ${passed}/20 PRUEBAS PASADAS`);
  if (failed === 0) {
    console.log('🎉 ¡TODAS LAS 20 PRUEBAS PASARON CON ÉXITO ROTUNDO!');
  } else {
    console.log(`⚠️ ${failed} PRUEBAS FALLARON.`);
  }
  console.log('====================================================');
}

run20TestSuite();
