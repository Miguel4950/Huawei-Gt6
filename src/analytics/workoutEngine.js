const dataLoader = require('../data/dataLoader');

class WorkoutEngine {
  getWorkouts() {
    return dataLoader.loadActivityRecords();
  }

  getLatestWorkout() {
    const workouts = this.getWorkouts();
    if (workouts.length === 0) return null;
    const w = workouts[0];

    // Compute training intensity and recovery hours needed
    let intensity = 'Baja';
    let recoveryHours = 12;

    if (w.maxHr >= 165 || w.elapsedSeconds >= 3600) {
      intensity = 'Muy Alta';
      recoveryHours = 48;
    } else if (w.maxHr >= 145 || w.elapsedSeconds >= 2400) {
      intensity = 'Alta';
      recoveryHours = 36;
    } else if (w.maxHr >= 125 || w.elapsedSeconds >= 1200) {
      intensity = 'Moderada';
      recoveryHours = 24;
    }

    const durationMinutes = Math.round(w.elapsedSeconds / 60);

    return {
      type: w.type || 'Entrenamiento',
      datetime: w.datetime,
      durationMinutes,
      activeSeconds: w.activeSeconds,
      distanceKm: w.distanceKm,
      calories: w.calories,
      avgHr: w.avgHr,
      maxHr: w.maxHr,
      steps: w.steps,
      intensity,
      recoveryHours,
      sourceFile: w.sourceFile
    };
  }
}

module.exports = new WorkoutEngine();
