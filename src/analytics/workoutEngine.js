const dataLoader = require('../data/dataLoader');

function formatActivityType(rawType) {
  if (!rawType || rawType === 'null' || rawType === 'GENERIC') return 'Actividad General / Libre';
  const norm = rawType.toUpperCase().trim();
  if (norm === 'WALKING' || norm === 'OUTDOOR_WALKING') return 'Caminata';
  if (norm === 'RUNNING' || norm === 'OUTDOOR_RUNNING') return 'Carrera / Trote';
  if (norm === 'CYCLING' || norm === 'OUTDOOR_CYCLING') return 'Ciclismo';
  if (norm === 'SWIMMING') return 'Natación';
  if (norm === 'STRENGTH_TRAINING' || norm === 'WEIGHTS') return 'Entrenamiento de Fuerza';
  if (norm === 'ELLIPTICAL') return 'Elíptica';
  if (norm === 'ROWING') return 'Remo';
  if (norm === 'YOGA' || norm === 'PILATES') return 'Movilidad / Yoga';
  return rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase();
}

class WorkoutEngine {
  getAllWorkouts() {
    return dataLoader.loadActivityRecords();
  }

  getLatestWorkout() {
    const workouts = this.getAllWorkouts();
    if (workouts.length === 0) return null;
    return this.analyzeWorkout(workouts[0]);
  }

  analyzeWorkout(w) {
    if (!w) return null;

    const durationSeconds = w.activeSeconds || w.elapsedSeconds || 0;
    const durationMinutes = parseFloat((durationSeconds / 60).toFixed(1));

    const avgHr = w.avgHr || 0;
    const maxHr = w.maxHr || 0;
    const distanceKm = w.distanceKm || 0;

    let paceFormatted = null;
    if (distanceKm > 0.1 && durationMinutes > 0) {
      const paceDecimal = durationMinutes / distanceKm;
      const paceMin = Math.floor(paceDecimal);
      const paceSec = Math.round((paceDecimal - paceMin) * 60);
      paceFormatted = `${paceMin}'${String(paceSec).padStart(2, '0')}" /km`;
    }

    // Calibración de intensidad y recuperación para Miguel (20 años, perfil sedentario)
    let intensity = 'Muy Ligera';
    let recoveryHours = 4;
    let trainingLoad = Math.round((durationMinutes * (avgHr / 100)) * 1.0);

    if (maxHr >= 170 || (avgHr >= 155 && durationMinutes >= 45)) {
      intensity = 'Muy Alta';
      recoveryHours = 36;
    } else if (maxHr >= 150 || (avgHr >= 135 && durationMinutes >= 35)) {
      intensity = 'Alta';
      recoveryHours = 24;
    } else if (maxHr >= 125 || (avgHr >= 110 && durationMinutes >= 25)) {
      intensity = 'Moderada';
      recoveryHours = 12;
    } else if (maxHr >= 100 || durationMinutes >= 30) {
      intensity = 'Ligera / Activa';
      recoveryHours = 8;
    }

    let hoursAgo = null;
    let hoursRemaining = recoveryHours;
    let recoveryStatus = '🟢 Recuperado — Listo para moverse';

    if (w.datetime) {
      try {
        const workoutDate = new Date(w.datetime.replace(/\./g, '-'));
        const now = new Date();
        const diffMs = now - workoutDate;
        hoursAgo = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(1));
        if (hoursAgo >= 0) {
          hoursRemaining = Math.max(0, parseFloat((recoveryHours - hoursAgo).toFixed(1)));
          if (hoursRemaining === 0) {
            recoveryStatus = '🟢 100% Recuperado — Listo para activarte';
          } else {
            recoveryStatus = `🟡 En Recuperación — Faltan ${hoursRemaining}h para descanso total`;
          }
        }
      } catch (err) {}
    }

    return {
      type: formatActivityType(w.type),
      rawType: w.type,
      datetime: w.datetime,
      durationMinutes,
      activeSeconds: w.activeSeconds,
      elapsedSeconds: w.elapsedSeconds,
      distanceKm,
      paceFormatted,
      calories: w.calories,
      avgHr,
      maxHr,
      steps: w.steps,
      intensity,
      trainingLoad,
      recoveryHours,
      recoveryHoursTotal: recoveryHours,
      hoursAgo,
      hoursRemaining,
      recoveryStatus,
      sourceFile: w.sourceFile
    };
  }

  getWorkoutHistory(limit = 5) {
    const list = this.getAllWorkouts();
    return list.slice(0, limit).map(w => this.analyzeWorkout(w));
  }
}

module.exports = new WorkoutEngine();
