const dataLoader = require('../data/dataLoader');

class OxygenEngine {
  getDailyRecords() {
    const records = dataLoader.loadOxygenRecords();
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
    let min = 100;
    let max = 0;
    let dropsBelow95 = 0;
    let dropsBelow90 = 0;

    let nocturnalSum = 0;
    let nocturnalCount = 0;
    let daytimeSum = 0;
    let daytimeCount = 0;

    for (const r of records) {
      const val = r.spo2;
      sum += val;
      if (val < min) min = val;
      if (val > max) max = val;
      if (val < 95) dropsBelow95++;
      if (val < 90) dropsBelow90++;

      const timePart = r.datetime.split(' ')[1] || '';
      const hour = parseInt(timePart.split(':')[0], 10);
      if (hour >= 0 && hour <= 7) {
        nocturnalSum += val;
        nocturnalCount++;
      } else {
        daytimeSum += val;
        daytimeCount++;
      }
    }

    const avg = sum / records.length;
    const nocturnalAvg = nocturnalCount > 0 ? nocturnalSum / nocturnalCount : avg;
    const daytimeAvg = daytimeCount > 0 ? daytimeSum / daytimeCount : avg;

    return {
      date: dayStr,
      recordCount: records.length,
      avgSpo2: parseFloat(avg.toFixed(1)),
      minSpo2: parseFloat(min.toFixed(1)),
      maxSpo2: parseFloat(max.toFixed(1)),
      nocturnalAvgSpo2: parseFloat(nocturnalAvg.toFixed(1)),
      daytimeAvgSpo2: parseFloat(daytimeAvg.toFixed(1)),
      dropsBelow95Count: dropsBelow95,
      dropsBelow90Count: dropsBelow90,
      respiratoryRisk: dropsBelow90 > 0 ? 'ALTO' : dropsBelow95 > 3 ? 'MODERADO' : 'NORMAL'
    };
  }

  getLatestDayStats() {
    const days = this.getDaysList();
    if (days.length === 0) return null;
    return this.analyzeDay(days[days.length - 1]);
  }

  correlateWithSleep(sleepSession) {
    if (!sleepSession) return null;
    const records = dataLoader.loadOxygenRecords();
    const start = sleepSession.startTime;
    const end = sleepSession.endTime;

    const inWindow = records.filter(r => r.datetime >= start && r.datetime <= end);
    if (inWindow.length === 0) return null;

    let min = 100;
    let drops = 0;
    let sum = 0;
    for (const r of inWindow) {
      sum += r.spo2;
      if (r.spo2 < min) min = r.spo2;
      if (r.spo2 < 95) drops++;
    }

    return {
      sampleCount: inWindow.length,
      avgSleepSpo2: parseFloat((sum / inWindow.length).toFixed(1)),
      minSleepSpo2: min,
      desaturationEvents: drops,
      breathingStability: drops === 0 ? 'Excelente' : drops <= 2 ? 'Buena' : 'Interrupciones detectadas'
    };
  }
}

module.exports = new OxygenEngine();
