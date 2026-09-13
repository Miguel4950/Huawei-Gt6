const sleepEngine = require('./sleepEngine');
const heartEngine = require('./heartEngine');
const oxygenEngine = require('./oxygenEngine');
const activityEngine = require('./activityEngine');
const workoutEngine = require('./workoutEngine');
const readinessEngine = require('./readinessEngine');
const config = require('../config/config');

class CrossAnalytics {
  /**
   * Calculates the Acute:Chronic Workload Ratio (ACWR).
   * Gold standard in Olympic & elite sports science (Tim Gabbett model)
   * Acute = 7-day rolling training load
   * Chronic = 28-day rolling training load (normalized to 7-day equivalent)
   */
  calculateACWR() {
    const workouts = workoutEngine.getAllWorkouts();
    if (workouts.length === 0) {
      return {
        hasData: false,
        acuteLoad: 0,
        chronicLoad: 0,
        acwr: 1.0,
        zone: 'Sin Datos',
        statusColor: '⚪',
        riskFactor: 'Desconocido',
        recommendation: 'Registra tus entrenamientos en el reloj para calcular tu carga óptima.'
      };
    }

    const analyzed = workouts.map(w => workoutEngine.analyzeWorkout(w));
    
    // Sort ascending by date
    analyzed.sort((a, b) => (a.datetime || '').localeCompare(b.datetime || ''));

    const latestWorkoutDate = new Date(analyzed[analyzed.length - 1].datetime.replace(/\./g, '-'));
    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    let acuteLoad = 0;
    let chronicLoadTotal = 0;
    let daysSpan = 28;

    if (analyzed.length > 0) {
      const earliestWorkoutDate = new Date(analyzed[0].datetime.replace(/\./g, '-'));
      const totalSpanDays = Math.max(1, Math.round((latestWorkoutDate - earliestWorkoutDate) / MS_PER_DAY));
      daysSpan = Math.min(28, Math.max(7, totalSpanDays));
    }

    analyzed.forEach(w => {
      if (!w.datetime) return;
      const d = new Date(w.datetime.replace(/\./g, '-'));
      const diffDays = (latestWorkoutDate - d) / MS_PER_DAY;

      if (diffDays <= 7 && diffDays >= 0) {
        acuteLoad += w.trainingLoad;
      }
      if (diffDays <= 28 && diffDays >= 0) {
        chronicLoadTotal += w.trainingLoad;
      }
    });

    // Chronic load weekly average (28-day window divided into 4 weeks)
    const weeksInChronic = Math.max(1, daysSpan / 7);
    const chronicLoadWeeklyAvg = Math.max(10, Math.round(chronicLoadTotal / weeksInChronic));
    const acwr = parseFloat((acuteLoad / chronicLoadWeeklyAvg).toFixed(2));

    let zone = '🟢 Óptimo (Sweet Spot)';
    let statusColor = '🟢';
    let riskFactor = 'Mínimo (< 5% riesgo de lesión)';
    let recommendation = 'Tu carga de entrenamiento está en perfecto equilibrio con tu capacidad adaptativa.';

    if (acwr < 0.8) {
      zone = '⚪ Sub-entrenamiento';
      statusColor = '⚪';
      riskFactor = 'Bajo (Riesgo de desadaptación física)';
      recommendation = 'Tu volumen semanal reciente es bajo. Puedes incrementar progresivamente la intensidad.';
    } else if (acwr >= 0.8 && acwr <= 1.3) {
      zone = '🟢 Zona Óptima ("Sweet Spot")';
      statusColor = '🟢';
      riskFactor = 'Mínimo / Ideal';
      recommendation = 'Excelente balance entre fatiga y condición física. Continúa con este ritmo.';
    } else if (acwr > 1.3 && acwr <= 1.5) {
      zone = '🟡 Sobrecarga Moderada';
      statusColor = '🟡';
      riskFactor = 'Moderado (Fatiga neuromuscular acumulada)';
      recommendation = 'Carga aguda elevada. Prioriza descanso y sesiones en Zona 2 antes del próximo pico.';
    } else {
      zone = '🔴 Zona Crítica de Peligro';
      statusColor = '🔴';
      riskFactor = 'Elevado (Riesgo de lesión x2 a x4)';
      recommendation = 'Has disparado tu volumen demasiado rápido. Obligatorio descanso activo o día libre.';
    }

    return {
      hasData: true,
      workoutsCount: analyzed.length,
      acuteLoad,
      chronicLoadWeeklyAvg,
      acwr,
      zone,
      statusColor,
      riskFactor,
      recommendation
    };
  }

  /**
   * Multi-variable Autonomic Nervous System (ANS) Balance
   * Blends Nocturnal Heart Rate Dip, RHR Trend vs 7d Baseline,
   * Sleep Recovery Ratio, and Nocturnal Oxygen Saturation Stability.
   */
  getAutonomicBalance() {
    const heart = heartEngine.getLatestDayStats();
    const rhrTrend = heartEngine.getRhrTrend();
    const sleep = sleepEngine.getLatestNight();
    const oxy = oxygenEngine.getLatestDayStats();

    if (!heart || !sleep) {
      return {
        ansScore: 75,
        state: 'Equilibrio Autonómico Estándar',
        vagalTone: 'Normal',
        dipPct: 12,
        rhrDelta: 0,
        sympatheticOverdrive: false,
        summary: 'Datos parciales para evaluación autonómica.'
      };
    }

    let ansScore = 50;

    // 1. Nocturnal Dip (Ideal 10-20%) -> adds up to 25 pts
    const dip = heart.nocturnalDipPct;
    if (dip >= 10 && dip <= 20) ansScore += 25;
    else if (dip > 20) ansScore += 20; // Extreme dipper
    else if (dip >= 5) ansScore += 12; // Mild non-dipper
    else ansScore += 5; // Flat / Inverted dip

    // 2. RHR Delta vs 7-day average -> adds up to 25 pts
    const delta = heart.restingHeartRate - (rhrTrend.recent7DaysAvgRhr || heart.restingHeartRate);
    if (delta <= -2) ansScore += 25;
    else if (delta <= 1) ansScore += 20;
    else if (delta <= 3) ansScore += 12;
    else ansScore += 4;

    // 3. Sleep Recovery Ratio (Deep + REM) / (Light + Awake) -> adds up to 25 pts
    const recRatio = sleep.recoveryRatio || 0.5;
    if (recRatio >= 0.65) ansScore += 25;
    else if (recRatio >= 0.50) ansScore += 20;
    else if (recRatio >= 0.40) ansScore += 12;
    else ansScore += 5;

    // 4. Oxygen & SpO2 stability -> adds up to 25 pts
    const minSpo2 = oxy ? oxy.minSpo2 : 95;
    if (minSpo2 >= 95) ansScore += 25;
    else if (minSpo2 >= 92) ansScore += 18;
    else ansScore += 8;

    ansScore = Math.min(100, Math.max(0, ansScore));

    let state = 'Equilibrio Vagal Óptimo';
    let vagalTone = 'Sobresaliente (Parasimpático Dominante)';
    let sympatheticOverdrive = false;

    if (ansScore >= 80) {
      state = '🟢 Tono Vagal Alto (Recuperación Celular Plena)';
      vagalTone = 'Excelente: El nervio vago frenó eficazmente el corazón durante la noche.';
    } else if (ansScore >= 60) {
      state = '🟡 Equilibrio Autonómico Funcional';
      vagalTone = 'Moderado: Tono simpático y parasimpático en equilibrio compensatorio.';
    } else {
      state = '🔴 Sobrecarga Simpática (Estrés / Fatiga)';
      vagalTone = 'Deprimido: Predominio de adrenalina/cortisol nocturno o digestión tardía.';
      sympatheticOverdrive = true;
    }

    return {
      ansScore,
      state,
      vagalTone,
      nocturnalDipPct: dip,
      dippingStatus: heart.dippingStatus,
      rhrDelta: delta,
      currentRhr: heart.restingHeartRate,
      baselineRhr: rhrTrend.recent7DaysAvgRhr,
      sleepRecoveryRatio: recRatio,
      cardiovascularStrainIndex: heart.cardiovascularStrainIndex,
      sympatheticOverdrive,
      summary: `Score autonómico: ${ansScore}/100. Dip nocturno de ${dip}% (${heart.dippingStatus}) y variación de RHR de ${delta > 0 ? '+' : ''}${delta} bpm.`
    };
  }

  /**
   * Daily Personalized Training Prescription
   * Synthesizes Readiness, Autonomic Balance, ACWR, Sleep Architecture,
   * and Karvonen Individualized Zones into an exact athletic workout prescription.
   */
  getDailyPrescription() {
    const readiness = readinessEngine.calculateReadiness();
    const acwrData = this.calculateACWR();
    const ans = this.getAutonomicBalance();
    const heart = heartEngine.getLatestDayStats();
    const latestWorkout = workoutEngine.getLatestWorkout();
    const sleep = sleepEngine.getLatestNight();

    const karvonen = heart ? heart.karvonenZones : {
      z1Recovery: '105 - 120 bpm',
      z2AerobicBase: '120 - 138 bpm',
      z3TempoCardio: '138 - 155 bpm',
      z4Threshold: '155 - 172 bpm',
      z5MaxEffort: '> 172 bpm'
    };

    let sessionType = 'Base Aeróbica en Zona 2';
    let intensityTag = 'Moderada (Construcción Mitocondrial)';
    let targetHeartZone = `Zona 2 Aeróbica (${karvonen.z2AerobicBase})`;
    let targetDurationMin = 45;
    let allowedActivities = ['Caminata a paso ligero con inclinación', 'Trote suave conversacional', 'Ciclismo indoor o ruta suave', 'Natación aeróbica continua'];
    let primaryFocus = 'Optimizar biogénesis mitocondrial y oxidación de lípidos sin acumulación de lactato.';
    let nutritionAdvice = '1.5L de agua con electrolitos. Carbohidratos complejos 2h antes y 25g de proteína al culminar.';
    let intensityLevel = 'MODERADA';
    let icon = '🟡';

    // Case 1: High Fatigue / ACWR Danger / High Sympathetic Overdrive
    if (readiness.score < 60 || acwrData.acwr >= 1.5 || (latestWorkout && latestWorkout.hoursRemaining > 16 && readiness.score < 70)) {
      sessionType = 'Descanso Activo / Regenerativo';
      intensityTag = 'Muy Baja (Día de Restauración Biológica)';
      targetHeartZone = `Zona 1 de Recuperación (${karvonen.z1Recovery})`;
      targetDurationMin = 25;
      allowedActivities = ['Caminata relajante al aire libre', 'Sesión de movilidad articular y yoga suave', 'Estiramientos miofasciales estáticos', 'Respiración diafragmática 4-7-8'];
      primaryFocus = 'Aclaramiento de metabolitos musculares, estimulación del drenaje linfático y recarga del sistema nervioso parasimpático.';
      nutritionAdvice = 'Hidratación abundante con magnesio y zinc por la noche. Evita estimulantes (cafeína) después de las 14:00.';
      intensityLevel = 'BAJA / REGENERATIVA';
      icon = '🔴';
    } 
    // Case 2: Peak Readiness / High Vagal Tone / Safe ACWR
    else if (readiness.score >= 85 && ans.ansScore >= 75 && acwrData.acwr <= 1.35) {
      sessionType = 'Sesión de Máxima Exigencia / HIIT o Fuerza Pesada';
      intensityTag = 'Alta / Máxima (Pico de Supercompensación)';
      targetHeartZone = `Zona 4 de Umbral (${karvonen.z4Threshold}) a Zona 5 (${karvonen.z5MaxEffort})`;
      targetDurationMin = 50;
      allowedActivities = ['Intervalos HIIT (4x4 min al 90% FC)', 'Entrenamiento de fuerza hipertrofia pesada (RPE 8-9)', 'Series de sprints en cuesta o bicicleta', 'Trote de ritmo umbral (Tempo Run)'];
      primaryFocus = 'Expandir el VO2max, reclutar fibras musculares de contracción rápida tipo II y elevar el umbral anaeróbico.';
      nutritionAdvice = '30-45g de carbohidratos de asimilación media antes del entreno. 30g de proteína de suero + 3g de creatina post-entrenamiento.';
      intensityLevel = 'ALTA';
      icon = '🟢';
    } 
    // Case 3: Good Condition -> Aerobic Base or Moderate Resistance
    else if (readiness.score >= 70) {
      sessionType = 'Base Aeróbica en Zona 2 & Hipertrofia Moderada';
      intensityTag = 'Moderada (Eficiencia Metabólica)';
      targetHeartZone = `Zona 2 Aeróbica (${karvonen.z2AerobicBase}) a Zona 3 (${karvonen.z3TempoCardio})`;
      targetDurationMin = 45;
      allowedActivities = ['Cardio Zona 2 en el que puedas mantener una conversación fluida', 'Musculación en rangos de 10-12 repeticiones', 'Calistenia controlada'];
      primaryFocus = 'Construir resistencia cardiovascular y capilarización muscular sin comprometer la recuperación de mañana.';
      nutritionAdvice = 'Comida balanceada con grasas saludables (aguacate, frutos secos) y proteína limpia.';
      intensityLevel = 'MODERADA';
      icon = '🟢';
    }

    return {
      date: sleep ? sleep.date : new Date().toISOString().split('T')[0],
      readinessScore: readiness.score,
      readinessLevel: readiness.level,
      ansScore: ans.ansScore,
      acwr: acwrData.acwr,
      acwrZone: acwrData.zone,
      sessionType,
      intensityTag,
      intensityLevel,
      icon,
      targetHeartZone,
      targetDurationMin,
      allowedActivities,
      primaryFocus,
      nutritionAdvice,
      residualWorkoutFatigue: latestWorkout ? `${latestWorkout.hoursRemaining}h pendientes (${latestWorkout.type})` : 'Ninguna',
      clinicalRationale: `Prescripción fundamentada en: Batería Corporal (${readiness.score}/100), Tono Vagal (${ans.ansScore}/100) y Ratio de Carga ACWR (${acwrData.acwr}).`
    };
  }

  /**
   * Computes Biological Fitness Age based on multi-variable clinical biomarkers:
   * Resting Heart Rate, Weekly Steps, Sleep Architecture & SpO2 stability.
   */
  getBiologicalFitnessAge() {
    const heart = heartEngine.getLatestDayStats();
    const rhrTrend = heartEngine.getRhrTrend();
    const weeklySteps = activityEngine.getWeeklySummary();
    const sleep = sleepEngine.getLatestNight();
    const oxy = oxygenEngine.getLatestDayStats();

    // Baseline reference: Dynamic user age from profile (default 21 years)
    const CHRONO_AGE_REF = (config.USER_PROFILE && config.USER_PROFILE.age) || 21;
    let delta = 0;
    const contributors = [];

    // Factor 1: Resting Heart Rate (Cardiovascular Efficiency)
    const rhr = rhrTrend.recent7DaysAvgRhr || (heart ? heart.restingHeartRate : 60);
    if (rhr < 52) {
      delta -= 4.0;
      contributors.push({ factor: 'Frecuencia Cardíaca en Reposo Atlética (< 52 bpm)', impactYears: -4.0 });
    } else if (rhr <= 60) {
      delta -= 2.5;
      contributors.push({ factor: 'RHR Saludable y Eficiente (52-60 bpm)', impactYears: -2.5 });
    } else if (rhr <= 70) {
      delta -= 0.5;
      contributors.push({ factor: 'RHR en rango normal (61-70 bpm)', impactYears: -0.5 });
    } else {
      delta += 2.5;
      contributors.push({ factor: 'RHR elevado (> 70 bpm) — Sobrecarga cardíaca', impactYears: +2.5 });
    }

    // Factor 2: Daily Step Average (Metabolic & Endothelial Health)
    const avgSteps = weeklySteps.avgDailySteps || 0;
    if (avgSteps >= 10000) {
      delta -= 3.0;
      contributors.push({ factor: 'Volumen diario activo sobresaliente (>= 10.000 pasos)', impactYears: -3.0 });
    } else if (avgSteps >= 7000) {
      delta -= 1.5;
      contributors.push({ factor: 'Volumen diario saludable (7.000 - 9.999 pasos)', impactYears: -1.5 });
    } else if (avgSteps < 4000) {
      delta += 2.0;
      contributors.push({ factor: 'Patrón sedentario detectado (< 4.000 pasos/día)', impactYears: +2.0 });
    }

    // Factor 3: Sleep Architecture & Deep Sleep (Cellular Rejuvenation)
    if (sleep) {
      if (sleep.efficiencyPct >= 88 && sleep.deepPct >= 16) {
        delta -= 2.0;
        contributors.push({ factor: 'Alta eficiencia de sueño y regeneración profunda', impactYears: -2.0 });
      } else if (sleep.efficiencyPct < 75 || sleep.deepPct < 10) {
        delta += 1.5;
        contributors.push({ factor: 'Sueño fragmentado o déficit de fase profunda', impactYears: +1.5 });
      }
    }

    // Factor 4: Nocturnal Oxygenation (Mitochondrial Integrity)
    if (oxy) {
      if (oxy.minSpo2 >= 95 && oxy.dropsBelow95Count === 0) {
        delta -= 1.0;
        contributors.push({ factor: 'Oxigenación tisular impecable (SpO2 >= 95%)', impactYears: -1.0 });
      } else if (oxy.dropsBelow90Count > 0) {
        delta += 2.0;
        contributors.push({ factor: 'Microdesaturaciones de oxígeno detectadas', impactYears: +2.0 });
      }
    }

    const bioAge = parseFloat((CHRONO_AGE_REF + delta).toFixed(1));
    const rejuvenationYears = parseFloat((CHRONO_AGE_REF - bioAge).toFixed(1));
    const longevityScore = Math.min(100, Math.max(0, Math.round(80 + (rejuvenationYears * 3.5))));

    return {
      chronologicalReferenceAge: CHRONO_AGE_REF,
      biologicalFitnessAge: bioAge,
      rejuvenationYears,
      longevityScore,
      verdict: rejuvenationYears > 0 
        ? `🔥 ¡Fisiológicamente tienes ${rejuvenationYears} años MENOS que tu edad cronológica!` 
        : `⚠️ Tu edad biológica coincide con tu edad cronológica o requiere optimización de hábitos.`,
      contributors
    };
  }
}

module.exports = new CrossAnalytics();
