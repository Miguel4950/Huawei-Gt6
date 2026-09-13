const dataLoader = require('../data/dataLoader');

class SleepEngine {
  /**
   * Partitions continuous sleep stage rows into distinct nights/sessions
   * based on a minimum gap of 4 hours (14400s) between events.
   */
  getSleepSessions() {
    const records = dataLoader.loadSleepRecords();
    if (records.length === 0) return [];

    const sessions = [];
    let currentSession = [records[0]];

    for (let i = 1; i < records.length; i++) {
      const prev = new Date(records[i - 1].datetime.replace(/\./g, '-'));
      const curr = new Date(records[i].datetime.replace(/\./g, '-'));
      const diffHours = (curr - prev) / (1000 * 60 * 60);

      if (diffHours >= 4) {
        sessions.push(this.analyzeSession(currentSession));
        currentSession = [records[i]];
      } else {
        currentSession.push(records[i]);
      }
    }
    if (currentSession.length > 0) {
      sessions.push(this.analyzeSession(currentSession));
    }

    return sessions;
  }

  analyzeSession(rows) {
    if (!rows || rows.length === 0) return null;

    const start = rows[0].datetime;
    const end = rows[rows.length - 1].datetime;

    let deep = 0;
    let rem = 0;
    let light = 0;
    let awake = 0;
    let awakeCount = 0;
    let longestAwake = 0;

    for (const r of rows) {
      const d = r.duration;
      switch (r.stage) {
        case 'deep':
          deep += d;
          break;
        case 'rem':
          rem += d;
          break;
        case 'light':
          light += d;
          break;
        case 'awake':
          awake += d;
          awakeCount++;
          if (d > longestAwake) longestAwake = d;
          break;
        default:
          light += d;
          break;
      }
    }

    const totalSleep = deep + rem + light;
    const inBed = totalSleep + awake;
    const efficiency = inBed > 0 ? (totalSleep / inBed) * 100 : 0;

    // Calculate latency: time from first awake event until first sleep event
    let latency = 0;
    if (rows[0].stage === 'awake') {
      latency = rows[0].duration;
    }

    // Ultradian cycles count (~90 mins = 5400 seconds)
    const cyclesCount = totalSleep > 0 ? (totalSleep / 5400).toFixed(1) : 0;
    const lastStage = rows[rows.length - 1].stage;
    const wokenUpInDeep = lastStage === 'deep';

    // Clinical Sleep Score (0-100)
    // Based on Duration (40%), Deep % (20%), REM % (20%), Efficiency (20%)
    let score = 0;
    const hours = totalSleep / 3600;
    if (hours >= 7 && hours <= 9) score += 40;
    else if (hours >= 6 || hours > 9) score += 30;
    else score += 15;

    const deepPct = totalSleep > 0 ? (deep / totalSleep) * 100 : 0;
    const remPct = totalSleep > 0 ? (rem / totalSleep) * 100 : 0;
    const lightPct = totalSleep > 0 ? (light / totalSleep) * 100 : 0;
    const awakePct = inBed > 0 ? (awake / inBed) * 100 : 0;

    if (deepPct >= 15 && deepPct <= 25) score += 20;
    else if (deepPct >= 10) score += 12;
    else score += 5;

    if (remPct >= 20 && remPct <= 28) score += 20;
    else if (remPct >= 15) score += 12;
    else score += 5;

    if (efficiency >= 85) score += 20;
    else if (efficiency >= 75) score += 12;
    else score += 5;

    // Date identifier (YYYY-MM-DD of the waking day)
    const endDate = end.split(' ')[0].replace(/\./g, '-');

    return {
      date: endDate,
      startTime: start,
      endTime: end,
      totalSleepSeconds: totalSleep,
      inBedSeconds: inBed,
      totalSleepHours: parseFloat((totalSleep / 3600).toFixed(2)),
      inBedHours: parseFloat((inBed / 3600).toFixed(2)),
      deepSeconds: deep,
      remSeconds: rem,
      lightSeconds: light,
      awakeSeconds: awake,
      deepPct: parseFloat(deepPct.toFixed(1)),
      remPct: parseFloat(remPct.toFixed(1)),
      lightPct: parseFloat(lightPct.toFixed(1)),
      awakePct: parseFloat(awakePct.toFixed(1)),
      efficiencyPct: parseFloat(efficiency.toFixed(1)),
      latencySeconds: latency,
      cyclesCount: parseFloat(cyclesCount),
      wokenUpInDeep,
      lastStage,
      awakeCount,
      longestAwakeSeconds: longestAwake,
      sleepScore: score,
      rawRowCount: rows.length
    };
  }

  getLatestNight() {
    const sessions = this.getSleepSessions();
    return sessions.length > 0 ? sessions[sessions.length - 1] : null;
  }

  getPreviousNight() {
    const sessions = this.getSleepSessions();
    return sessions.length > 1 ? sessions[sessions.length - 2] : null;
  }

  calculateSleepDebt(targetHoursPerDay = 8.0) {
    const sessions = this.getSleepSessions();
    // Use last 7 sessions
    const recent = sessions.slice(-7);
    if (recent.length === 0) return { totalDebtHours: 0, avgSleepHours: 0, daysCount: 0 };

    let totalActual = 0;
    recent.forEach(s => totalActual += s.totalSleepHours);
    const expected = recent.length * targetHoursPerDay;
    const debt = expected - totalActual;

    return {
      targetHoursPerDay,
      daysCount: recent.length,
      totalActualHours: parseFloat(totalActual.toFixed(2)),
      expectedHours: parseFloat(expected.toFixed(2)),
      totalDebtHours: parseFloat(debt.toFixed(2)),
      avgDailySleepHours: parseFloat((totalActual / recent.length).toFixed(2))
    };
  }

  determineChronotype() {
    const sessions = this.getSleepSessions();
    if (sessions.length === 0) return { chronotype: 'Desconocido', avgBedtimeHour: 0 };

    let totalHour = 0;
    sessions.forEach(s => {
      const timePart = s.startTime.split(' ')[1] || '00:00:00';
      let hour = parseInt(timePart.split(':')[0], 10);
      const min = parseInt(timePart.split(':')[1], 10);
      if (hour >= 18) hour = hour - 24; // Convert 23:00 to -1 for circular average
      totalHour += (hour + min / 60);
    });

    const avg = totalHour / sessions.length;
    let chronotype = 'Intermedio';
    if (avg < -1.5) chronotype = 'Alondra (Madrugador)'; // Before 22:30
    else if (avg > 1.0) chronotype = 'Búho (Noctámbulo)'; // After 01:00 AM

    return {
      chronotype,
      avgBedtimeOffset: parseFloat(avg.toFixed(2)),
      sessionsSampled: sessions.length
    };
  }
}

module.exports = new SleepEngine();
