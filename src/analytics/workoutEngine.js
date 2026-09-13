const dataLoader = require('../data/dataLoader');

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

    let intensity = 'Baja';
    let recoveryHours = 12;
    let trainingLoad = Math.round((durationMinutes * (avgHr / 100)) * 1.2);

    if (maxHr >= 170 || (avgHr >= 155 && durationMinutes >= 45)) {
      intensity = 'Muy Alta';
      recoveryHours = 48;
    } else if (maxHr >= 155 || (avgHr >= 140 && durationMinutes >= 30)) {
      intensity = 'Alta';
      recoveryHours = 36;
    } else if (maxHr >= 135 || durationMinutes >= 25) {
      intensity = 'Moderada';
      recoveryHours = 24;
    } else if (maxHr >= 115 || durationMinutes >= 15) {
      intensity = 'Baja';
      recoveryHours = 16;
    }

    let hoursAgo = null;
    let hoursRemaining = recoveryHours;
    let recoveryStatus = 'En Recuperación Activa';

    if (w.datetime) {
      try {
        const workoutDate = new Date(w.datetime.replace(/\./g, '-'));
        const now = new Date();
        const diffMs = now - workoutDate;
        hoursAgo = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(1));
        if (hoursAgo >= 0) {
          hoursRemaining = Math.max(0, parseFloat((recoveryHours - hoursAgo).toFixed(1)));
          if (hoursRemaining === 0) {
            recoveryStatus = '🟢 100% Recuperado — Listo para entrenar';
          } else {
            recoveryStatus = `🟡 En Recuperación — Faltan ${hoursRemaining}h para descanso total`;
          }
        }
      } catch (err) {}
    }

    return {
      type: w.type === 'null' || !w.type ? 'Actividad General' : w.type,
      datetime: w.datetime,
      durationMinutes,
      activeSeconds: w.activeSeconds,
      elapsedSeconds: w.elapsedSeconds,
      distanceKm: w.distanceKm,
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
