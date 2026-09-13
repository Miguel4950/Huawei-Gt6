const fs = require('fs');
const path = require('path');
const config = require('../config/config');

/**
 * Parses simple CSV content safely into array of objects or rows.
 */
function parseCsv(content) {
  if (!content) return [];
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    if (values.length === headers.length) {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx];
      });
      rows.push(obj);
    }
  }
  return rows;
}

class DataLoader {
  constructor(dataDir = config.HEALTH_DATA_DIR) {
    this.dataDir = dataDir;
  }

  getFolderPath(folderName) {
    // Search case-insensitive or accented folder names
    if (!fs.existsSync(this.dataDir)) {
      return null;
    }
    const entries = fs.readdirSync(this.dataDir);
    const match = entries.find(e => 
      e.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === 
      folderName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    );
    return match ? path.join(this.dataDir, match) : null;
  }

  listFiles(folderName) {
    const folderPath = this.getFolderPath(folderName);
    if (!folderPath || !fs.existsSync(folderPath)) return [];
    return fs.readdirSync(folderPath).map(file => ({
      name: file,
      fullPath: path.join(folderPath, file),
      stat: fs.statSync(path.join(folderPath, file))
    }));
  }

  loadSleepRecords() {
    const files = this.listFiles('Health Sync Sueño');
    const records = [];
    for (const f of files) {
      if (f.name.endsWith('.csv')) {
        const content = fs.readFileSync(f.fullPath, 'utf8');
        const rows = parseCsv(content);
        for (const r of rows) {
          const rawFecha = r['Fecha'] || r['fecha'];
          const rawDuration = r['Duración en segundos'] || r['duracion en segundos'] || r['Duracion en segundos'];
          const rawStage = r['Etapa del sueño'] || r['etapa del sueno'] || r['Etapa del sueno'];
          if (rawFecha && rawDuration && rawStage) {
            records.push({
              datetime: rawFecha,
              duration: parseInt(rawDuration, 10),
              stage: rawStage.toLowerCase().trim(),
              sourceFile: f.name
            });
          }
        }
      }
    }
    // Sort chronologically
    records.sort((a, b) => a.datetime.localeCompare(b.datetime));
    return records;
  }

  loadHeartRateRecords() {
    const files = this.listFiles('Health Sync Frecuencia cardíaca');
    const records = [];
    for (const f of files) {
      if (f.name.endsWith('.csv')) {
        const content = fs.readFileSync(f.fullPath, 'utf8');
        const rows = parseCsv(content);
        for (const r of rows) {
          const rawFecha = r['Fecha'] || r['fecha'];
          const rawHr = r['Frecuencia cardiaca'] || r['Frecuencia cardíaca'];
          if (rawFecha && rawHr) {
            const hr = parseInt(rawHr, 10);
            if (!isNaN(hr) && hr > 30 && hr < 240) {
              records.push({
                datetime: rawFecha,
                bpm: hr,
                sourceFile: f.name
              });
            }
          }
        }
      }
    }
    records.sort((a, b) => a.datetime.localeCompare(b.datetime));
    return records;
  }

  loadOxygenRecords() {
    const files = this.listFiles('Health Sync Saturación de oxígeno');
    const records = [];
    for (const f of files) {
      if (f.name.endsWith('.csv')) {
        const content = fs.readFileSync(f.fullPath, 'utf8');
        const rows = parseCsv(content);
        for (const r of rows) {
          const rawFecha = r['Fecha'] || r['fecha'];
          const rawSpo2 = r['Saturación de oxígeno'] || r['Saturacion de oxigeno'];
          if (rawFecha && rawSpo2) {
            const spo2 = parseFloat(rawSpo2);
            if (!isNaN(spo2) && spo2 > 50 && spo2 <= 100) {
              records.push({
                datetime: rawFecha,
                spo2: spo2,
                sourceFile: f.name
              });
            }
          }
        }
      }
    }
    records.sort((a, b) => a.datetime.localeCompare(b.datetime));
    return records;
  }

  loadStepsRecords() {
    const files = this.listFiles('Health Sync Pasos');
    const records = [];
    for (const f of files) {
      if (f.name.endsWith('.csv')) {
        const content = fs.readFileSync(f.fullPath, 'utf8');
        const rows = parseCsv(content);
        for (const r of rows) {
          const rawFecha = r['Fecha'] || r['fecha'];
          const rawSteps = r['Pasos'] || r['pasos'];
          if (rawFecha && rawSteps) {
            const steps = parseInt(rawSteps, 10);
            if (!isNaN(steps)) {
              records.push({
                datetime: rawFecha,
                steps: steps,
                sourceFile: f.name
              });
            }
          }
        }
      }
    }
    records.sort((a, b) => a.datetime.localeCompare(b.datetime));
    return records;
  }

  loadActivityRecords() {
    const files = this.listFiles('Health Sync Actividades');
    const records = [];
    for (const f of files) {
      if (f.name.endsWith('.csv')) {
        const content = fs.readFileSync(f.fullPath, 'utf8');
        const rows = parseCsv(content);
        for (const r of rows) {
          records.push({
            type: r['Tipo de actividad'] || 'GENERIC',
            datetime: r['Fecha'] || '',
            elapsedSeconds: parseInt(r['Tiempo transcurrido'] || '0', 10),
            activeSeconds: parseInt(r['Tiempo activo'] || '0', 10),
            distanceKm: parseFloat(r['Distancia (km)'] || '0'),
            calories: parseFloat(r['Calorías (kcal)'] || '0'),
            avgHr: parseInt(r['Frecuencia cardíaca media'] || '0', 10),
            maxHr: parseInt(r['Frecuencia cardíaca máxima'] || '0', 10),
            steps: parseInt(r['Pasos'] || '0', 10),
            sourceFile: f.name
          });
        }
      }
    }
    records.sort((a, b) => (b.datetime || '').localeCompare(a.datetime || ''));
    return records;
  }
}

module.exports = new DataLoader();
