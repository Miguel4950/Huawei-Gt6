const assert = require('assert');
const dataLoader = require('../src/data/dataLoader');
const sleepEngine = require('../src/analytics/sleepEngine');
const heartEngine = require('../src/analytics/heartEngine');
const oxygenEngine = require('../src/analytics/oxygenEngine');
const activityEngine = require('../src/analytics/activityEngine');
const workoutEngine = require('../src/analytics/workoutEngine');
const readinessEngine = require('../src/analytics/readinessEngine');
const crossAnalytics = require('../src/analytics/crossAnalytics');
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

  // 1. Arquitectura de sueño avanzada: duración, eficiencia y front-loading profundo
  test('01. Arquitectura de sueño: duración, eficiencia y Deep Sleep Front-Loading', () => {
    const sleep = sleepEngine.getLatestNight();
    assert.ok(sleep, 'Debe existir la última noche de sueño');
    assert.ok(sleep.totalSleepHours > 4, 'Horas de sueño deben ser mayores a 4h');
    assert.ok(sleep.efficiencyPct >= 70 && sleep.efficiencyPct <= 100, 'Eficiencia debe estar entre 70% y 100%');
    assert.strictEqual(typeof sleep.deepFrontLoadingPct, 'number', 'Front-loading deep sleep debe ser numérico');
    assert.strictEqual(typeof sleep.isDeepWellFrontLoaded, 'boolean', 'isDeepWellFrontLoaded debe ser booleano');
  });

  // 2. Fases del sueño y ratio restaurativo
  test('02. Fases de sueño y Sleep Recovery Ratio (Deep+REM)/(Light+Awake)', () => {
    const sleep = sleepEngine.getLatestNight();
    const sumPct = sleep.deepPct + sleep.remPct + sleep.lightPct;
    assert.ok(Math.abs(sumPct - 100) < 1.0, 'La suma de fases dormidas debe aproximarse al 100%');
    assert.ok(sleep.recoveryRatio > 0.2, 'Recovery Ratio debe ser positivo y realista');
    assert.strictEqual(typeof sleep.recoveryRatio, 'number', 'Recovery ratio debe ser número');
  });

  // 3. Ciclos ultradianos de 90 min y punto medio de sueño (Social Jetlag)
  test('03. Ciclos ultradianos (~90 min) y Sleep Midpoint circadiano', () => {
    const sleep = sleepEngine.getLatestNight();
    assert.ok(sleep.cyclesCount >= 3.0, 'Debe haber al menos 3 ciclos de sueño');
    assert.ok(sleep.sleepMidpoint.includes(':'), 'Sleep midpoint debe ser una hora válida HH:MM');
  });

  // 4. Frecuencia cardíaca en reposo (RHR) y zonas de Karvonen
  test('04. Frecuencia Cardíaca en Reposo (RHR) y umbrales individualizados de Karvonen', () => {
    const stats = heartEngine.getLatestDayStats();
    assert.ok(stats, 'Debe existir estadísticas cardíacas');
    assert.ok(stats.restingHeartRate >= 40 && stats.restingHeartRate <= 90, 'RHR debe estar en rango fisiológico (40-90 bpm)');
    assert.ok(stats.karvonenZones.z1Recovery, 'Debe calcular Zona 1 Karvonen');
    assert.ok(stats.karvonenZones.z2AerobicBase, 'Debe calcular Zona 2 Karvonen');
  });

  // 5. Descenso cardíaco nocturno (Nocturnal Dip %) y clasificación clínica
  test('05. Descenso Cardíaco Nocturno (Nocturnal Dip %) y clasificación dipper', () => {
    const stats = heartEngine.getLatestDayStats();
    assert.strictEqual(typeof stats.nocturnalDipPct, 'number', 'Dip % debe ser numérico');
    assert.ok(stats.dippingStatus.length > 0, 'Dipping status debe contener descripción clínica');
  });

  // 6. Índice de Tensión Cardiovascular (CSI)
  test('06. Cálculo del Índice de Tensión Cardiovascular (CSI 0-100)', () => {
    const stats = heartEngine.getLatestDayStats();
    assert.ok(stats.cardiovascularStrainIndex >= 0 && stats.cardiovascularStrainIndex <= 100, 'CSI debe estar entre 0 y 100');
  });

  // 7. Detección de picos de estrés autonómico (FC alta con pasos = 0)
  test('07. Detección de taquicardia o estrés simpático en reposo', () => {
    const days = heartEngine.getDaysList();
    const latestDay = days[days.length - 1];
    const spikes = heartEngine.detectStressSpikes(latestDay);
    assert.ok(Array.isArray(spikes), 'Spikes debe retornar un arreglo');
  });

  // 8. Saturación de Oxígeno (SpO2) y caídas nocturnas
  test('08. Muestreo de SpO2 y desaturaciones en ventana de sueño', () => {
    const oxy = oxygenEngine.getLatestDayStats();
    assert.ok(oxy, 'Debe existir registro de SpO2');
    assert.ok(oxy.avgSpo2 >= 90 && oxy.avgSpo2 <= 100, 'SpO2 promedio debe ser 90-100%');
    const sleep = sleepEngine.getLatestNight();
    const corr = oxygenEngine.correlateWithSleep(sleep);
    assert.ok(corr, 'Debe correlacionar con sueño');
    assert.ok(corr.sampleCount > 0, 'Debe haber muestras nocturnas de SpO2');
  });

  // 9. Agregación de pasos, calorías activas y bloques sedentarios
  test('09. Pasos diarios, calorías activas y bloques continuos de inactividad', () => {
    const act = activityEngine.getLatestDayStats();
    assert.ok(act, 'Debe haber estadísticas de actividad');
    assert.ok(act.totalSteps >= 0, 'Pasos positivos');
    assert.strictEqual(typeof act.sedentaryDaytimeHours, 'number', 'Horas sedentarias numéricas');
    assert.strictEqual(typeof act.maxSedentaryStreakHours, 'number', 'Racha sedentaria numérica');
  });

  // 10. Procesamiento de entrenamientos y cronómetro de recuperación biológica
  test('10. Análisis de entrenamientos, carga EPOC y cuenta regresiva de recuperación', () => {
    const w = workoutEngine.getLatestWorkout();
    assert.ok(w, 'Debe cargar el último entrenamiento');
    assert.ok(w.trainingLoad >= 0, 'Carga de entrenamiento positiva');
    assert.ok(w.recoveryHoursTotal >= 12, 'Horas de descanso totales >= 12h');
    assert.strictEqual(typeof w.hoursRemaining, 'number', 'Horas restantes numéricas');
    assert.ok(w.recoveryStatus.length > 0, 'Estado de recuperación descriptivo');
  });

  // 11. Score de Recuperación / Readiness multivariable (0-100)
  test('11. Score de Recuperación / Body Battery con integración autonómica y muscular', () => {
    const readiness = readinessEngine.calculateReadiness();
    assert.ok(readiness.score >= 0 && readiness.score <= 100, 'Readiness entre 0 y 100');
    assert.ok(['ÓPTIMO', 'MODERADO', 'BAJO (FATIGA)'].includes(readiness.level), 'Nivel válido');
    assert.ok(readiness.components.nocturnalDipPct !== undefined, 'Debe incluir dip nocturno');
  });

  // 12. Ratio Agudo:Crónico de Carga de Entrenamiento (ACWR)
  test('12. Ratio Agudo:Crónico de Carga (ACWR Tim Gabbett) y zona de riesgo lesional', () => {
    const acwrData = crossAnalytics.calculateACWR();
    assert.strictEqual(typeof acwrData.acwr, 'number', 'ACWR debe ser numérico');
    assert.ok(acwrData.zone.length > 0, 'Debe asignar una zona de rendimiento');
    assert.ok(acwrData.riskFactor.length > 0, 'Debe evaluar el riesgo lesional');
  });

  // 13. Balance del Sistema Nervioso Autónomo y Tono Vagal
  test('13. Evaluación del Balance Autónomo (ANS Score 0-100 y Tono Vagal)', () => {
    const ans = crossAnalytics.getAutonomicBalance();
    assert.ok(ans.ansScore >= 0 && ans.ansScore <= 100, 'ANS Score entre 0 y 100');
    assert.strictEqual(typeof ans.sympatheticOverdrive, 'boolean', 'Sympathetic overdrive booleano');
    assert.ok(ans.vagalTone.length > 0, 'Tono vagal evaluado');
  });

  // 14. Prescripción Diaria Personalizada de Entrenamiento
  test('14. Prescripción Diaria de Entrenamiento con zonas Karvonen y nutrición', () => {
    const p = crossAnalytics.getDailyPrescription();
    assert.ok(p.sessionType.length > 0, 'Debe prescribir tipo de sesión');
    assert.ok(p.targetHeartZone.length > 0, 'Debe prescribir rango de pulso');
    assert.ok(p.targetDurationMin > 0, 'Duración positiva');
    assert.ok(Array.isArray(p.allowedActivities), 'Actividades permitidas como arreglo');
    assert.ok(p.nutritionAdvice.length > 0, 'Consejo nutricional incluido');
  });

  // 15. Edad Biológica y Longevidad Celular
  test('15. Cálculo de Edad Biológica Biométrica vs Edad Cronológica', () => {
    const bio = crossAnalytics.getBiologicalFitnessAge();
    assert.strictEqual(typeof bio.biologicalFitnessAge, 'number', 'Edad biológica numérica');
    assert.strictEqual(typeof bio.rejuvenationYears, 'number', 'Años de rejuvenecimiento numéricos');
    assert.ok(bio.longevityScore >= 0 && bio.longevityScore <= 100, 'Score de longevidad 0-100');
    assert.ok(bio.contributors.length > 0, 'Debe desglosar factores determinantes');
  });

  // 16. Deuda acumulada de sueño y cronotipo circadiano
  test('16. Deuda de sueño acumulada en 7 días y cronotipo circadiano', () => {
    const debt = sleepEngine.calculateSleepDebt(8.0);
    assert.strictEqual(typeof debt.totalDebtHours, 'number', 'Deuda numérica');
    const chrono = sleepEngine.determineChronotype();
    assert.ok(['Alondra (Madrugador)', 'Búho (Noctámbulo)', 'Intermedio'].includes(chrono.chronotype), 'Cronotipo válido');
  });

  // 17. Tendencia semanal de RHR y variaciones porcentuales
  test('17. Tendencia semanal de RHR y comparativa histórica', () => {
    const rhrTrend = heartEngine.getRhrTrend();
    assert.ok(rhrTrend.trend.length > 0, 'Debe haber historial');
    assert.ok(rhrTrend.recent7DaysAvgRhr > 0, 'RHR promedio positivo');
  });

  // 18. Fragmentación segura de mensajes de Telegram y conversión de tablas markdown
  test('18. Partición segura de mensajes largos (splitMessage) y conversión de tablas markdown a viñetas', () => {
    const longText = 'Párrafo de prueba sobre fisiología deportiva.\n\n'.repeat(150);
    const chunks = formatters.splitMessage(longText, 3000);
    assert.ok(chunks.length > 1, 'Debe dividir en múltiples fragmentos');
    for (const chunk of chunks) {
      assert.ok(chunk.length <= 3200, 'Ningún chunk debe exceder el límite seguro');
    }

    // Probar conversión automática de tabla Markdown y eliminación de encabezados ###
    const sampleTable = `| Métrica | Noche 11 | Noche 12 | Análisis |\n|---|---|---|---|\n| **Tiempo Total** | 7.55 h | 7.43 h | Duración estable |`;
    const converted = formatters.convertMarkdownTables(sampleTable);
    assert.ok(!converted.includes('|'), 'No debe contener caracteres de barra de tabla');
    assert.ok(converted.includes('• *Tiempo Total:* 7.55 h ➔ *7.43 h* — Duración estable'), 'Debe formatear como viñeta');

    const sampleHeaders = `### Título Sección\n#### Subtítulo`;
    const cleanH = formatters.cleanTelegramMarkdown(sampleHeaders);
    assert.ok(!cleanH.includes('#'), 'No debe contener caracteres almohadilla #');
    assert.ok(cleanH.includes('🔹 *Título Sección*'), 'Debe convertir ### a viñeta con emoji');
    assert.ok(cleanH.includes('🔸 *Subtítulo*'), 'Debe convertir #### a viñeta con emoji');
  });

  // 19. Verificación de compresión y eficiencia de tokens (<600 tokens de entrada)
  test('19. Verificación de compresión del payload para Gemini (< 600 tokens de entrada)', () => {
    const p = crossAnalytics.getDailyPrescription();
    const prompt = prompts.buildPrescriptionPrompt(p);
    const tokenEst = Math.round(prompt.length / 4);
    assert.ok(tokenEst < 600, `El prompt debe ser menor a 600 tokens (estimado actual: ${tokenEst} tokens)`);
  });

  // 20. Conectividad real con Gemini 3.8 Flash (Thinking MEDIUM) y control presupuestario
  await testAsync('20. Conectividad real con Gemini 3.8 Flash (Thinking MEDIUM) y control presupuestario', async () => {
    const p = crossAnalytics.getDailyPrescription();
    const prompt = prompts.buildPrescriptionPrompt(p);

    const result = await geminiCoach.generateAnalysis(prompt, { model: 'gemini-3.8-flash', thinkingLevel: 'MEDIUM' });
    assert.ok(result.text && result.text.length > 50, 'Gemini debe devolver una respuesta sustanciosa');
    assert.ok(result.tokensEstimate.total < 3500, 'Los tokens totales por consulta deben ser menores a 3500');

    const costSummary = geminiCoach.getCostSummary();
    assert.ok(costSummary.totalCostUsd < 0.01, 'El costo de la consulta debe ser menor a un centavo de dólar');
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
