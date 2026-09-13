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
    const workout = require('./workoutEngine').getLatestWorkout();

    if (!sleep) {
      return {
        score: 75,
        level: 'MODERADO',
        color: '🟡',
        verdict: 'Datos de sueño insuficientes para cálculo preciso.',
        components: {}
      };
    }

    let score = 0;

    // 1. Arquitectura y Regeneración del Sueño (Máx 35 pts)
    const hours = sleep.totalSleepHours;
    if (hours >= 7.5 && hours <= 9) score += 20;
    else if (hours >= 6.5) score += 16;
    else if (hours >= 5.5) score += 10;
    else score += 5;

    // Fases restaurativas (Deep & REM)
    if (sleep.deepPct >= 15 && sleep.remPct >= 20) score += 10;
    else if (sleep.deepPct >= 12 || sleep.remPct >= 18) score += 7;
    else score += 4;

    // Bonus por front-loading de sueño profundo (reparación miofibrilar en 1ra mitad)
    if (sleep.isDeepWellFrontLoaded) score += 3;
    if (sleep.recoveryRatio >= 0.6) score += 2;

    // 2. Estado Autonómico y Vagal (Máx 30 pts)
    const currentRhr = heart ? heart.restingHeartRate : 60;
    const avgRhr = rhrTrend.recent7DaysAvgRhr || currentRhr;
    const diff = currentRhr - avgRhr;
    if (diff <= -2) score += 15; // RHR más bajo de lo habitual -> supercompensación
    else if (diff <= 2) score += 12; // RHR en rango habitual
    else if (diff <= 5) score += 7; // RHR ligeramente elevado -> estrés o fatiga
    else score += 2; // RHR muy elevado -> sobrecarga simpática aguda

    // Nocturnal Heart Rate Dip % (Clínica cardiológica: 10-20% es normal)
    const dip = heart ? heart.nocturnalDipPct : 12;
    if (dip >= 10 && dip <= 20) score += 15; // Dipper fisiológico
    else if (dip > 20) score += 12; // Extreme dipper
    else if (dip >= 5) score += 7; // Non-dipper leve
    else score += 3; // Non-dipper severo / carga simpática nocturna

    // 3. Estabilidad de Oxígeno y Eficiencia (Máx 20 pts)
    if (oxygen) {
      if (oxygen.minSpo2 >= 95) score += 10;
      else if (oxygen.minSpo2 >= 92) score += 7;
      else score += 3;
    } else {
      score += 8;
    }

    if (sleep.efficiencyPct >= 90) score += 10;
    else if (sleep.efficiencyPct >= 80) score += 7;
    else score += 4;

    // 4. Factor de Carga y Fatiga Residual de Entrenamiento (Máx 15 pts)
    let workoutDeduction = 0;
    if (workout && workout.hoursRemaining > 0) {
      if (workout.hoursRemaining > 24) workoutDeduction = 6;
      else if (workout.hoursRemaining > 12) workoutDeduction = 3;
      else workoutDeduction = 1;
    }
    score += Math.max(0, 15 - workoutDeduction);

    score = Math.min(100, Math.max(0, score));

    let level = 'MODERADO';
    let color = '🟡';
    let advice = 'Tu energía y tono autonómico están en nivel funcional. Apto para una caminata continua de 30-40 min, pausas activas y estiramientos.';

    if (score >= 85) {
      level = 'ÓPTIMO';
      color = '🟢';
      advice = 'Excelente nivel de energía y descanso. Momento perfecto para salir a caminar a paso ágil, subir escaleras, romper el sedentarismo y realizar ejercicios de fuerza con peso corporal.';
    } else if (score < 65) {
      level = 'BAJO (FATIGA)';
      color = '🔴';
      advice = 'Fatiga acumulada o sueño insuficiente. Evita sobrecargas: prioriza descansos breves, paseos suaves de descarga, buena hidratación y acostarte más temprano hoy.';
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
        recoveryRatio: sleep.recoveryRatio,
        isDeepWellFrontLoaded: sleep.isDeepWellFrontLoaded,
        efficiencyPct: sleep.efficiencyPct,
        currentRhr,
        baselineRhr: avgRhr,
        rhrDelta: diff,
        nocturnalDipPct: dip,
        dippingStatus: heart ? heart.dippingStatus : 'Normal',
        minSpo2: oxygen ? oxygen.minSpo2 : 96,
        workoutHoursRemaining: workout ? workout.hoursRemaining : 0
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
