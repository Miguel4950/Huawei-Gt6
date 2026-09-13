const sleepEngine = require('./sleepEngine');
const heartEngine = require('./heartEngine');
const oxygenEngine = require('./oxygenEngine');
const activityEngine = require('./activityEngine');

class ReadinessEngine {
  calculateReadiness() {
    const sleep = sleepEngine.getLatestNight();
    const heart = heartEngine.getLatestDayStats();
    const rhrTrend = heartEngine.getRhrTrend();
    const oxygen = oxygenEngine.getLatestDayStats();
    const activity = activityEngine.getLatestDayStats();

    if (!sleep) {
      return {
        score: 75,
        level: 'MODERADO',
        color: '🟡',
        verdict: 'Datos de sueño insuficientes para cálculo preciso.'
      };
    }

    let score = 0;

    // 1. Duración y eficiencia de sueño (máx 35 pts)
    const hours = sleep.totalSleepHours;
    if (hours >= 7.5 && hours <= 9) score += 35;
    else if (hours >= 6.5) score += 28;
    else if (hours >= 5.5) score += 20;
    else score += 10;

    // 2. Calidad de fases: Profundo y REM (máx 25 pts)
    if (sleep.deepPct >= 15 && sleep.remPct >= 20) score += 25;
    else if (sleep.deepPct >= 12 || sleep.remPct >= 18) score += 18;
    else score += 10;

    // 3. Frecuencia cardíaca en reposo vs promedio semanal (máx 20 pts)
    const currentRhr = heart ? heart.restingHeartRate : 60;
    const avgRhr = rhrTrend.recent7DaysAvgRhr || currentRhr;
    const diff = currentRhr - avgRhr;
    if (diff <= -2) score += 20; // RHR is lower than usual -> excellent recovery
    else if (diff <= 2) score += 17; // RHR is normal
    else if (diff <= 5) score += 10; // RHR slightly elevated -> mild fatigue
    else score += 4; // RHR significantly elevated -> strong fatigue / stress

    // 4. Estabilidad de Oxígeno (máx 10 pts)
    if (oxygen) {
      if (oxygen.minSpo2 >= 95) score += 10;
      else if (oxygen.minSpo2 >= 92) score += 7;
      else score += 3;
    } else {
      score += 8;
    }

    // 5. Eficiencia de sueño (máx 10 pts)
    if (sleep.efficiencyPct >= 90) score += 10;
    else if (sleep.efficiencyPct >= 80) score += 7;
    else score += 4;

    score = Math.min(100, Math.max(0, score));

    let level = 'MODERADO';
    let color = '🟡';
    let advice = 'Tu cuerpo tiene energía moderada. Apto para entrenamiento estándar o cardio de base.';

    if (score >= 85) {
      level = 'ÓPTIMO';
      color = '🟢';
      advice = 'Recuperación muscular y del sistema nervioso sobresaliente. Día ideal para esfuerzos máximos, pesas o cardio intenso.';
    } else if (score < 65) {
      level = 'BAJO (FATIGA)';
      color = '🔴';
      advice = 'Fatiga acumulada detectada. Prioriza descanso activo, hidratación, estiramientos y acuéstate más temprano hoy.';
    }

    return {
      score,
      level,
      color,
      advice,
      components: {
        sleepScore: sleep.sleepScore,
        sleepHours: sleep.totalSleepHours,
        deepPct: sleep.deepPct,
        remPct: sleep.remPct,
        efficiencyPct: sleep.efficiencyPct,
        currentRhr,
        baselineRhr: avgRhr,
        rhrDelta: diff,
        minSpo2: oxygen ? oxygen.minSpo2 : 96
      }
    };
  }

  correlateExerciseAndSleep() {
    const sleep = sleepEngine.getLatestNight();
    const prevSleep = sleepEngine.getPreviousNight();
    const workout = require('./workoutEngine').getLatestWorkout();

    return {
      latestNight: sleep,
      previousNight: prevSleep,
      latestWorkout: workout,
      analysis: 'Cruce entre la última sesión deportiva registrada y la arquitectura del sueño posterior.'
    };
  }

  findPerfectDay() {
    const sleepSessions = sleepEngine.getSleepSessions();
    if (sleepSessions.length === 0) return null;

    let bestSession = sleepSessions[0];
    let bestMetric = 0;

    for (const s of sleepSessions) {
      // Score combined by duration, deep sleep %, and efficiency
      const metric = (s.totalSleepHours * 10) + s.deepPct + (s.efficiencyPct * 0.5);
      if (metric > bestMetric) {
        bestMetric = metric;
        bestSession = s;
      }
    }

    return {
      date: bestSession.date,
      session: bestSession,
      highlights: `Noche del ${bestSession.date}: ${bestSession.totalSleepHours}h de sueño, ${bestSession.deepPct}% sueño profundo y ${bestSession.efficiencyPct}% de eficiencia.`
    };
  }
}

module.exports = new ReadinessEngine();
