const dataLoader = require('../data/dataLoader');

class HeartEngine {
  /**
   * Groups heart rate records by day (YYYY.MM.DD)
   */
  getDailyRecords() {
    const records = dataLoader.loadHeartRateRecords();
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

    let sum = 0;
    let min = 999;
    let max = 0;
    const nocturnal = [];
    const values = [];

    // Zones tracking in counts
    let z1 = 0; // < 100
    let z2 = 0; // 100 - 120
    let z3 = 0; // 120 - 140
    let z4 = 0; // 140 - 160
    let z5 = 0; // > 160

    for (const r of records) {
      const bpm = r.bpm;
      values.push(bpm);
      sum += bpm;
      if (bpm < min) min = bpm;
      if (bpm > max) max = bpm;

      const timePart = r.datetime.split(' ')[1] || '';
      const hour = parseInt(timePart.split(':')[0], 10);
      // Nocturnal window: 00:00 to 07:00
      if (hour >= 0 && hour <= 6) {
        nocturnal.push(bpm);
      }

      if (bpm < 100) z1++;
      else if (bpm <= 120) z2++;
      else if (bpm <= 140) z3++;
      else if (bpm <= 160) z4++;
      else z5++;
    }

    const avg = sum / records.length;

    // Resting Heart Rate (RHR): average of lowest 15% of nocturnal readings (or min of nocturnal)
    let rhr = min;
    if (nocturnal.length > 0) {
      nocturnal.sort((a, b) => a - b);
      const sliceCount = Math.max(1, Math.floor(nocturnal.length * 0.15));
      const lowestSlice = nocturnal.slice(0, sliceCount);
      rhr = Math.round(lowestSlice.reduce((a, b) => a + b, 0) / lowestSlice.length);
    }

    const total = records.length;

    return {
      date: dayStr,
      recordCount: total,
      minBpm: min,
      maxBpm: max,
      avgBpm: Math.round(avg),
      restingHeartRate: rhr,
      zones: {
        z1Count: z1,
        z2Count: z2,
        z3Count: z3,
        z4Count: z4,
        z5Count: z5,
        z1Pct: parseFloat(((z1 / total) * 100).toFixed(1)),
        z2Pct: parseFloat(((z2 / total) * 100).toFixed(1)),
        z3Pct: parseFloat(((z3 / total) * 100).toFixed(1)),
        z4Pct: parseFloat(((z4 / total) * 100).toFixed(1)),
        z5Pct: parseFloat(((z5 / total) * 100).toFixed(1))
      }
    };
  }

  getLatestDayStats() {
    const days = this.getDaysList();
    if (days.length === 0) return null;
    return this.analyzeDay(days[days.length - 1]);
  }

  getPreviousDayStats() {
    const days = this.getDaysList();
    if (days.length < 2) return null;
    return this.analyzeDay(days[days.length - 2]);
  }

  getRhrTrend() {
    const days = this.getDaysList();
    const trend = [];
    for (const d of days) {
      const stats = this.analyzeDay(d);
      if (stats) {
        trend.push({ date: d, rhr: stats.restingHeartRate, avg: stats.avgBpm });
      }
    }
    const recent = trend.slice(-7);
    const avgRecentRhr = recent.length > 0 
      ? Math.round(recent.reduce((acc, x) => acc + x.rhr, 0) / recent.length) 
      : 0;

    return {
      trend,
      recent7DaysAvgRhr: avgRecentRhr,
      latestRhr: trend.length > 0 ? trend[trend.length - 1].rhr : 0
    };
  }

  detectStressSpikes(dayStr) {
    const byDay = this.getDailyRecords();
    const heartRows = byDay[dayStr] || [];
    const stepsRows = dataLoader.loadStepsRecords().filter(r => r.datetime.startsWith(dayStr));

    // Map steps by hour-minute (or 10-min block)
    const stepMap = {};
    for (const s of stepsRows) {
      const timeKey = s.datetime.substring(0, 15); // YYYY.MM.DD HH:m
      stepMap[timeKey] = (stepMap[timeKey] || 0) + s.steps;
    }

    const spikes = [];
    for (const h of heartRows) {
      if (h.bpm >= 100) {
        const timeKey = h.datetime.substring(0, 15);
        const stepsAround = stepMap[timeKey] || 0;
        if (stepsAround === 0) {
          spikes.push({
            datetime: h.datetime,
            bpm: h.bpm,
            steps: stepsAround,
            note: 'Pico elevado en reposo (posible estrés o estimulante)'
          });
        }
      }
    }

    return spikes;
  }
}

module.exports = new HeartEngine();
