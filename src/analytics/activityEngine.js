const dataLoader = require('../data/dataLoader');
const config = require('../config/config');

class ActivityEngine {
  getDailyRecords() {
    const records = dataLoader.loadStepsRecords();
    const byDay = {};
    for (const r of records) {
      const day = r.datetime.split(' ')[0];
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(r);
    }
    return byDay;
  }

  getDaysList() {
    return Object.keys(this.getDailyRecords()).sort();
  }

  analyzeDay(dayStr) {
    const byDay = this.getDailyRecords();
    const records = byDay[dayStr];
    if (!records || records.length === 0) return null;

    let totalSteps = 0;
    const hourly = {};

    for (let h = 0; h < 24; h++) {
      const padH = String(h).padStart(2, '0');
      hourly[padH] = 0;
    }

    for (const r of records) {
      totalSteps += r.steps;
      const timePart = r.datetime.split(' ')[1] || '';
      const hour = timePart.split(':')[0];
      if (hourly[hour] !== undefined) {
        hourly[hour] += r.steps;
      }
    }

    // Find peak hour
    let peakHour = '12';
    let maxHourSteps = 0;
    for (const [h, s] of Object.entries(hourly)) {
      if (s > maxHourSteps) {
        maxHourSteps = s;
        peakHour = h;
      }
    }

    // Sedentary periods: count consecutive daytime hours (08:00 - 21:00) with < 100 steps
    let sedentaryHoursCount = 0;
    let currentStreak = 0;
    let maxSedentaryStreak = 0;

    for (let h = 8; h <= 21; h++) {
      const padH = String(h).padStart(2, '0');
      const stepsInHour = hourly[padH] || 0;
      if (stepsInHour < 100) {
        sedentaryHoursCount++;
        currentStreak++;
        if (currentStreak > maxSedentaryStreak) maxSedentaryStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
    }

    const targetSteps = config.USER_GOALS.dailySteps;
    const completionPct = Math.min(100, Math.round((totalSteps / targetSteps) * 100));

    // Distance estimation: 1 step ~ 0.75m = 0.00075 km
    const distanceKm = parseFloat((totalSteps * 0.00075).toFixed(2));
    // Active calories estimation: ~0.04 kcal per step
    const activeCalories = Math.round(totalSteps * 0.04);

    return {
      date: dayStr,
      totalSteps,
      targetSteps,
      completionPct,
      distanceKm,
      activeCalories,
      peakHour: `${peakHour}:00 - ${peakHour}:59 (${maxHourSteps} pasos)`,
      hourlyBreakdown: hourly,
      sedentaryDaytimeHours: sedentaryHoursCount,
      maxSedentaryStreakHours: maxSedentaryStreak
    };
  }

  getLatestDayStats() {
    const days = this.getDaysList();
    if (days.length === 0) return null;
    return this.analyzeDay(days[days.length - 1]);
  }

  getWeeklySummary() {
    const days = this.getDaysList().slice(-7);
    let total = 0;
    const daily = [];
    for (const d of days) {
      const st = this.analyzeDay(d);
      if (st) {
        total += st.totalSteps;
        daily.push({ date: d, steps: st.totalSteps, distanceKm: st.distanceKm });
      }
    }
    const avg = daily.length > 0 ? Math.round(total / daily.length) : 0;
    return {
      daysAnalyzed: daily.length,
      totalSteps: total,
      avgDailySteps: avg,
      daily
    };
  }
}

module.exports = new ActivityEngine();
