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
    if (!fs.existsSync(this.dataDir)) {
      return null;
    }
    const entries = fs.readdirSync(this.dataDir);
    // 1. Exact normalized match (e.g. "Health Sync Actividades")
    const normTarget = folderName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let match = entries.find(e => 
      e.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === normTarget
    );
    if (match) return path.join(this.dataDir, match);

    // 2. Keyword fallback (e.g. "sueño", "actividad", "pasos", "cardiaca", "oxigeno", "peso")
    const keywords = normTarget.replace('health sync', '').trim().split(/\s+/).filter(Boolean);
    match = entries.find(e => {
      const normE = e.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return keywords.some(k => normE.includes(k));
    });
    return match ? path.join(this.dataDir, match) : null;
  }

  listFiles(folderName) {
    const list = [];
    const seenPaths = new Set();

    const addFilesFromDir = (dirPath) => {
      if (!dirPath || !fs.existsSync(dirPath)) return;
      try {
        const entries = fs.readdirSync(dirPath);
        for (const file of entries) {
          const fullPath = path.join(dirPath, file);
          try {
            const stat = fs.statSync(fullPath);
            if (stat.isFile() && !seenPaths.has(fullPath)) {
              seenPaths.add(fullPath);
              list.push({ name: file, fullPath, stat });
            }
          } catch (e) {}
        }
      } catch (e) {}
    };

    const targetFolder = this.getFolderPath(folderName);
    if (targetFolder) {
      addFilesFromDir(targetFolder);
    }

    // Also check root of dataDir for matching files (e.g. if files are placed directly in dataDir)
    if (fs.existsSync(this.dataDir)) {
      try {
        const rootEntries = fs.readdirSync(this.dataDir);
        const normTarget = folderName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        for (const file of rootEntries) {
          const fullPath = path.join(this.dataDir, file);
          try {
            const stat = fs.statSync(fullPath);
            if (stat.isFile() && !seenPaths.has(fullPath)) {
              const lowerName = file.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
              const ext = path.extname(file).toLowerCase();
              let matchesCategory = false;

              if (normTarget.includes('actividad') && (
                lowerName.includes('walking') || lowerName.includes('running') || lowerName.includes('cycling') ||
                lowerName.includes('actividad') || lowerName.includes('ejercicio') || lowerName.includes('generic') ||
                ['.tcx', '.fit', '.gpx', '.kml'].includes(ext)
              )) {
                matchesCategory = true;
              } else if (normTarget.includes('sueno') && (lowerName.includes('sueno') || lowerName.includes('sleep'))) {
                matchesCategory = true;
              } else if (normTarget.includes('frecuencia') && (lowerName.includes('frecuencia') || lowerName.includes('cardiaca') || lowerName.includes('heart'))) {
                matchesCategory = true;
              } else if (normTarget.includes('paso') && (lowerName.includes('paso') || lowerName.includes('step'))) {
                matchesCategory = true;
              } else if (normTarget.includes('oxigeno') && (lowerName.includes('oxigeno') || lowerName.includes('saturacion') || lowerName.includes('spo2'))) {
                matchesCategory = true;
              } else if (normTarget.includes('peso') && (lowerName.includes('peso') || lowerName.includes('weight'))) {
                matchesCategory = true;
              }

              if (matchesCategory) {
                seenPaths.add(fullPath);
                list.push({ name: file, fullPath, stat });
              }
            }
          } catch (e) {}
        }
      } catch (e) {}
    }

    return list;
  }

  loadSleepRecords() {
    const files = this.listFiles('Health Sync Sueño');
    const recordsMap = new Map();
    for (const f of files) {
      if (f.name.endsWith('.csv')) {
        const content = fs.readFileSync(f.fullPath, 'utf8');
        const rows = parseCsv(content);
        for (const r of rows) {
          const rawFecha = r['Fecha'] || r['fecha'] || r['Date'];
          const rawDuration = r['Duración en segundos'] || r['duracion en segundos'] || r['Duracion en segundos'] || r['Duration (s)'];
          const rawStage = r['Etapa del sueño'] || r['etapa del sueno'] || r['Etapa del sueno'] || r['Sleep stage'];
          if (rawFecha && rawDuration && rawStage) {
            const key = rawFecha.trim();
            recordsMap.set(key, {
              datetime: key,
              duration: parseInt(rawDuration, 10),
              stage: rawStage.toLowerCase().trim(),
              sourceFile: f.name
            });
          }
        }
      }
    }
    const records = Array.from(recordsMap.values());
    records.sort((a, b) => a.datetime.localeCompare(b.datetime));
    return records;
  }

  loadHeartRateRecords() {
    const files = this.listFiles('Health Sync Frecuencia cardíaca');
    const recordsMap = new Map();
    for (const f of files) {
      if (f.name.endsWith('.csv')) {
        const content = fs.readFileSync(f.fullPath, 'utf8');
        const rows = parseCsv(content);
        for (const r of rows) {
          const rawFecha = r['Fecha'] || r['fecha'] || r['Date'];
          const rawHr = r['Frecuencia cardiaca'] || r['Frecuencia cardíaca'] || r['frecuencia cardiaca'] || r['Heart rate'];
          if (rawFecha && rawHr) {
            const hr = parseInt(rawHr, 10);
            if (!isNaN(hr) && hr > 30 && hr < 240) {
              const key = rawFecha.trim();
              recordsMap.set(key, {
                datetime: key,
                bpm: hr,
                sourceFile: f.name
              });
            }
          }
        }
      }
    }
    const records = Array.from(recordsMap.values());
    records.sort((a, b) => a.datetime.localeCompare(b.datetime));
    return records;
  }

  loadOxygenRecords() {
    const files = this.listFiles('Health Sync Saturación de oxígeno');
    const recordsMap = new Map();
    for (const f of files) {
      if (f.name.endsWith('.csv')) {
        const content = fs.readFileSync(f.fullPath, 'utf8');
        const rows = parseCsv(content);
        for (const r of rows) {
          const rawFecha = r['Fecha'] || r['fecha'] || r['Date'];
          const rawSpo2 = r['Saturación de oxígeno'] || r['Saturacion de oxigeno'] || r['saturacion de oxigeno'] || r['SpO2'];
          if (rawFecha && rawSpo2) {
            const spo2 = parseFloat(rawSpo2);
            if (!isNaN(spo2) && spo2 > 50 && spo2 <= 100) {
              const key = rawFecha.trim();
              recordsMap.set(key, {
                datetime: key,
                spo2: spo2,
                sourceFile: f.name
              });
            }
          }
        }
      }
    }
    const records = Array.from(recordsMap.values());
    records.sort((a, b) => a.datetime.localeCompare(b.datetime));
    return records;
  }

  loadStepsRecords() {
    const files = this.listFiles('Health Sync Pasos');
    const recordsMap = new Map();
    for (const f of files) {
      if (f.name.endsWith('.csv')) {
        const content = fs.readFileSync(f.fullPath, 'utf8');
        const rows = parseCsv(content);
        for (const r of rows) {
          const rawFecha = r['Fecha'] || r['fecha'] || r['Date'];
          const rawSteps = r['Pasos'] || r['pasos'] || r['Steps'];
          if (rawFecha && rawSteps) {
            const steps = parseInt(rawSteps, 10);
            if (!isNaN(steps)) {
              const key = rawFecha.trim();
              recordsMap.set(key, {
                datetime: key,
                steps: steps,
                sourceFile: f.name
              });
            }
          }
        }
      }
    }
    const records = Array.from(recordsMap.values());
    records.sort((a, b) => a.datetime.localeCompare(b.datetime));
    return records;
  }

  loadActivityRecords() {
    const files = this.listFiles('Health Sync Actividades');
    const recordsMap = new Map();
    for (const f of files) {
      if (f.name.endsWith('.csv')) {
        const content = fs.readFileSync(f.fullPath, 'utf8');
        const rows = parseCsv(content);
        for (const r of rows) {
          const type = r['Tipo de actividad'] || r['tipo de actividad'] || r['Activity type'] || 'GENERIC';
          const datetime = (r['Fecha'] || r['fecha'] || r['Date'] || '').trim();
          if (!datetime) continue;
          const key = `${datetime}_${type}`;
          recordsMap.set(key, {
            type,
            datetime,
            elapsedSeconds: parseInt(r['Tiempo transcurrido'] || r['tiempo transcurrido'] || r['Elapsed time'] || '0', 10),
            activeSeconds: parseInt(r['Tiempo activo'] || r['tiempo activo'] || r['Active time'] || '0', 10),
            distanceKm: parseFloat(r['Distancia (km)'] || r['distancia (km)'] || r['Distancia(km)'] || '0'),
            calories: parseFloat(r['Calorías (kcal)'] || r['calorías (kcal)'] || r['Calorias (kcal)'] || '0'),
            avgHr: parseInt(r['Frecuencia cardíaca media'] || r['frecuencia cardíaca media'] || r['Frecuencia cardiaca media'] || '0', 10),
            maxHr: parseInt(r['Frecuencia cardíaca máxima'] || r['frecuencia cardíaca máxima'] || r['Frecuencia cardiaca maxima'] || '0', 10),
            steps: parseInt(r['Pasos'] || r['pasos'] || '0', 10),
            sourceFile: f.name
          });
        }
      }
    }
    const records = Array.from(recordsMap.values());
    records.sort((a, b) => (b.datetime || '').localeCompare(a.datetime || ''));
    return records;
  }

  loadWeightRecords() {
    const files = this.listFiles('Health Sync Peso');
    const records = [];
    for (const f of files) {
      if (f.name.endsWith('.csv')) {
        const content = fs.readFileSync(f.fullPath, 'utf8');
        const rows = parseCsv(content);
        for (const r of rows) {
          const rawFecha = r['Fecha'] || r['fecha'];
          const rawWeight = r['Peso'] || r['peso'];
          if (rawFecha && rawWeight) {
            const weight = parseFloat(rawWeight);
            if (!isNaN(weight) && weight > 20 && weight < 300) {
              records.push({
                datetime: rawFecha,
                weightKg: weight,
                bodyFatPct: parseFloat(r['Porcentaje de grasa corporal'] || '0'),
                muscleMassKg: parseFloat(r['Masa muscular'] || '0'),
                boneMassKg: parseFloat(r['La masa ósea'] || '0'),
                waterPct: parseFloat(r['Agua corporal total'] || '0'),
                bmrCalories: parseInt(r['Tasa metabólica base'] || '0', 10),
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
}

module.exports = new DataLoader();

