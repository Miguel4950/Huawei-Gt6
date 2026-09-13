const dataLoader = require('../data/dataLoader');

class SleepEngine {
  /**
   * Partitions continuous sleep stage rows into distinct nights/sessions
   * based on a minimum gap of 4 hours between events.
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

    // Temporal tracking for Deep Sleep front-loading (first half vs second half)
    const totalDurationSeconds = rows.reduce((acc, r) => acc + r.duration, 0);
    const halfMark = totalDurationSeconds / 2;
    let runningElapsed = 0;
    let deepFirstHalf = 0;
    let deepSecondHalf = 0;

    for (const r of rows) {
      const d = r.duration;
      const isFirstHalf = runningElapsed < halfMark;

      switch (r.stage) {
        case 'deep':
          deep += d;
          if (isFirstHalf) deepFirstHalf += d;
          else deepSecondHalf += d;
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
      runningElapsed += d;
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

    // Sleep Midpoint Calculation (Punto Medio del Sueño)
    // Used by chronobiologists to measure social jetlag & circadian shift
    let midpointTimeStr = '';
    try {
      const startDate = new Date(start.replace(/\./g, '-'));
      const midDate = new Date(startDate.getTime() + (inBed * 1000) / 2);
      midpointTimeStr = midDate.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
    } catch (e) {
      midpointTimeStr = '06:00';
    }

    // Deep Sleep Front-Loading Ratio (Ideally > 65% in first half for cellular repair)
    const deepFrontLoadingPct = deep > 0 ? Math.round((deepFirstHalf / deep) * 100) : 0;
    const isDeepWellFrontLoaded = deepFrontLoadingPct >= 60;

    // Sleep Recovery Ratio: (Deep + REM) / (Light + Awake)
    // High-performance ratio: > 0.60 is optimal, < 0.40 indicates restless/shallow sleep
    const restorativeSleep = deep + rem;
    const nonRestorativeSleep = light + awake;
    const recoveryRatio = nonRestorativeSleep > 0 
      ? parseFloat((restorativeSleep / nonRestorativeSleep).toFixed(2)) 
      : 0.5;

    // Fragmentation Index: awakenings per hour of sleep
    const hoursSleep = totalSleep / 3600;
    const fragmentationIndex = hoursSleep > 0 
      ? parseFloat((awakeCount / hoursSleep).toFixed(1)) 
      : 0;

    // Clinical Sleep Score (0-100)
    let score = 0;
    if (hoursSleep >= 7 && hoursSleep <= 9) score += 35;
    else if (hoursSleep >= 6 || hoursSleep > 9) score += 25;
    else score += 12;

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

    if (efficiency >= 88) score += 15;
    else if (efficiency >= 78) score += 10;
    else score += 4;

    // Bonus for good deep sleep front-loading and recovery ratio
    if (isDeepWellFrontLoaded) score += 5;
    if (recoveryRatio >= 0.6) score += 5;

    score = Math.min(100, Math.max(0, score));

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
      // Advanced physiological indices
      sleepMidpoint: midpointTimeStr,
      deepFrontLoadingPct,
      isDeepWellFrontLoaded,
      recoveryRatio,
      fragmentationIndex,
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
    if (sessions.length === 0) return { chronotype: 'Desconocido', avgBedtimeOffset: 0, midpoints: [] };

    let totalHour = 0;
    const midpoints = [];

    sessions.forEach(s => {
      const timePart = s.startTime.split(' ')[1] || '00:00:00';
      let hour = parseInt(timePart.split(':')[0], 10);
      const min = parseInt(timePart.split(':')[1], 10);
      if (hour >= 18) hour = hour - 24;
      totalHour += (hour + min / 60);
      if (s.sleepMidpoint) midpoints.push(s.sleepMidpoint);
    });

    const avg = totalHour / sessions.length;
    let chronotype = 'Intermedio';
    if (avg < -1.5) chronotype = 'Alondra (Madrugador)';
    else if (avg > 1.0) chronotype = 'Búho (Noctámbulo)';

    return {
      chronotype,
      avgBedtimeOffset: parseFloat(avg.toFixed(2)),
      sessionsSampled: sessions.length,
      midpoints
    };
  }

  getSleepHistoryStats() {
    const sessions = this.getSleepSessions();
    if (sessions.length === 0) return null;

    const latest = sessions[sessions.length - 1];
    const previous = sessions.length > 1 ? sessions[sessions.length - 2] : null;

    // Últimos 7 descansos (Semana)
    const weekSessions = sessions.slice(-7);
    const weekCount = weekSessions.length;
    const weekAvgHours = weekSessions.reduce((acc, s) => acc + s.totalSleepHours, 0) / weekCount;
    const weekAvgEff = weekSessions.reduce((acc, s) => acc + s.efficiencyPct, 0) / weekCount;
    const weekAvgDeep = weekSessions.reduce((acc, s) => acc + s.deepPct, 0) / weekCount;
    const weekAvgRem = weekSessions.reduce((acc, s) => acc + s.remPct, 0) / weekCount;

    // Últimos 30 descansos (Mes)
    const monthSessions = sessions.slice(-30);
    const monthCount = monthSessions.length;
    const monthAvgHours = monthSessions.reduce((acc, s) => acc + s.totalSleepHours, 0) / monthCount;
    const monthAvgEff = monthSessions.reduce((acc, s) => acc + s.efficiencyPct, 0) / monthCount;
    const monthAvgDeep = monthSessions.reduce((acc, s) => acc + s.deepPct, 0) / monthCount;
    const monthAvgRem = monthSessions.reduce((acc, s) => acc + s.remPct, 0) / monthCount;

    // Deuda de sueño (meta de 8 horas)
    const debt = this.calculateSleepDebt(8.0);
    const chronotype = this.determineChronotype();

    // Deltas de la última noche vs promedios
    const deltaWeekHours = parseFloat((latest.totalSleepHours - weekAvgHours).toFixed(2));
    const deltaMonthHours = parseFloat((latest.totalSleepHours - monthAvgHours).toFixed(2));
    const deltaWeekDeep = parseFloat((latest.deepPct - weekAvgDeep).toFixed(1));
    const deltaWeekEff = parseFloat((latest.efficiencyPct - weekAvgEff).toFixed(1));

    return {
      latest,
      previous,
      weekly: {
        sessionsCount: weekCount,
        avgHours: parseFloat(weekAvgHours.toFixed(2)),
        avgEfficiency: parseFloat(weekAvgEff.toFixed(1)),
        avgDeepPct: parseFloat(weekAvgDeep.toFixed(1)),
        avgRemPct: parseFloat(weekAvgRem.toFixed(1)),
        deltaHours: deltaWeekHours,
        deltaDeepPct: deltaWeekDeep,
        deltaEfficiency: deltaWeekEff
      },
      monthly: {
        sessionsCount: monthCount,
        avgHours: parseFloat(monthAvgHours.toFixed(2)),
        avgEfficiency: parseFloat(monthAvgEff.toFixed(1)),
        avgDeepPct: parseFloat(monthAvgDeep.toFixed(1)),
        avgRemPct: parseFloat(monthAvgRem.toFixed(1)),
        deltaHours: deltaMonthHours
      },
      debt,
      chronotype
    };
  }
}

module.exports = new SleepEngine();
