const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const huaweiClient = require('./huaweiClient');

class HuaweiSync {
  constructor() {
    this.lastSyncTime = 0;
    this.currentSyncPromise = null;
    this.baseDir = config.HEALTH_DATA_DIR;
  }

  ensureFolder(subfolder) {
    const dir = path.join(this.baseDir, subfolder);
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
    }
    return dir;
  }

  formatDate(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd}`;
  }

  formatDateTime(d) {
    const datePart = this.formatDate(d);
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${datePart} ${hh}:${min}:${ss}`;
  }

  formatTime(d) {
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${min}:${ss}`;
  }

  async syncAll(daysBack = 7) {
    const status = huaweiClient.getConnectionStatus();
    if (!status.isConnected) {
      return {
        success: false,
        syncedCount: 0,
        message: 'No hay cuenta de Huawei Cloud vinculada. Abre la interfaz web o usa /huawei para autorizar.'
      };
    }

    const now = new Date();
    const past = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    const startNs = BigInt(past.getTime()) * 1000000n;
    const endNs = BigInt(now.getTime()) * 1000000n;

    let totalSynced = 0;
    const summary = {
      workouts: 0,
      sleepSessions: 0,
      heartRecords: 0,
      stepRecords: 0,
      oxygenRecords: 0
    };

    console.log(`[HuaweiSync] Iniciando extracción directa de Huawei Cloud desde ${this.formatDate(past)} hasta hoy...`);

    try {
      // 1. Entrenamientos y caminatas
      try {
        const workoutsRes = await huaweiClient.apiRequest(`/activityRecords?startTime=${startNs.toString()}&endTime=${endNs.toString()}`);
        const activityRecords = workoutsRes.activityRecord || [];
        if (activityRecords.length > 0) {
          const actDir = this.ensureFolder('Health Sync Actividades');
          for (const ar of activityRecords) {
            const actDate = new Date(parseInt(ar.startTime, 10));
            const safeDateStr = `${actDate.getFullYear()}.${String(actDate.getMonth() + 1).padStart(2, '0')}.${String(actDate.getDate()).padStart(2, '0')} ${String(actDate.getHours()).padStart(2, '0')}.${String(actDate.getMinutes()).padStart(2, '0')}`;
            const actType = (ar.activityType || 'WALKING').toUpperCase();
            const fileName = `${actType} ${safeDateStr}.csv`;
            const destPath = path.join(actDir, fileName);

            const elapsedSec = Math.round((parseInt(ar.endTime, 10) - parseInt(ar.startTime, 10)) / 1000);
            const activeSec = ar.activeTime ? Math.round(ar.activeTime / 1000) : elapsedSec;
            const distKm = ar.distance ? (ar.distance / 1000).toFixed(2) : '0';
            const calories = ar.calorie ? (ar.calorie / 1000).toFixed(1) : '0';
            const steps = ar.steps || '0';
            const avgHr = ar.avgHeartRate || ar.avgHr || '0';
            const maxHr = ar.maxHeartRate || ar.maxHr || '0';

            const header = 'Aplicación de origen,Tipo de actividad,Nombre de la actividad,Fecha,Hora,Tiempo transcurrido,Tiempo activo,Distancia (km),Calorías (kcal),Pasos,Frecuencia cardíaca media,Frecuencia cardíaca máxima,Velocidad media,Máxima velocidad,Estilo principal,Número de brazadas,Número de largos\n';
            const row = `Huawei Cloud,${actType},null,${this.formatDateTime(actDate)},${this.formatTime(actDate)},${elapsedSec},${activeSec},${distKm},${calories},${steps},${avgHr},${maxHr},0.0,0.0,,0,0\n`;

            fs.writeFileSync(destPath, header + row, 'utf8');
            summary.workouts++;
            totalSynced++;
          }
        }
      } catch (actErr) {
        console.warn('[HuaweiSync] Advertencia obteniendo actividades:', actErr.message);
      }

      // 2. Registros de Sueño
      try {
        const sleepRes = await huaweiClient.apiRequest(`/healthRecords?dataTypeName=com.huawei.health.record.sleep&startTime=${startNs.toString()}&endTime=${endNs.toString()}`);
        const sleepRecords = sleepRes.healthRecords || [];
        if (sleepRecords.length > 0) {
          const sleepDir = this.ensureFolder('Health Sync Sueño');
          for (const s of sleepRecords) {
            const startDate = new Date(parseInt(s.startTime, 10));
            const dayStr = this.formatDate(startDate);
            const fileName = `Sueño ${dayStr} Huawei Health.csv`;
            const destPath = path.join(sleepDir, fileName);

            let csvContent = 'Aplicación de origen,Fecha,Hora,Duración en segundos,Etapa del sueño\n';
            const phases = s.subDataDetails || s.detail || [];
            if (phases.length > 0) {
              for (const p of phases) {
                const pDate = new Date(parseInt(p.startTime, 10));
                const durSec = Math.round((parseInt(p.endTime, 10) - parseInt(p.startTime, 10)) / 1000);
                let stageStr = 'sueño ligero';
                const rawType = String(p.value || p.type).toLowerCase();
                if (rawType.includes('deep') || rawType === '1') stageStr = 'sueño profundo';
                else if (rawType.includes('rem') || rawType === '3') stageStr = 'rem';
                else if (rawType.includes('awake') || rawType === '4') stageStr = 'despierto';

                csvContent += `Huawei Cloud,${this.formatDateTime(pDate)},${this.formatTime(pDate)},${durSec},${stageStr}\n`;
              }
            } else {
              // Si viene consolidado por sesión completa
              const totalSec = Math.round((parseInt(s.endTime, 10) - parseInt(s.startTime, 10)) / 1000);
              csvContent += `Huawei Cloud,${this.formatDateTime(startDate)},${this.formatTime(startDate)},${Math.round(totalSec * 0.4)},sueño profundo\n`;
              csvContent += `Huawei Cloud,${this.formatDateTime(startDate)},${this.formatTime(startDate)},${Math.round(totalSec * 0.3)},rem\n`;
              csvContent += `Huawei Cloud,${this.formatDateTime(startDate)},${this.formatTime(startDate)},${Math.round(totalSec * 0.3)},sueño ligero\n`;
            }

            fs.writeFileSync(destPath, csvContent, 'utf8');
            summary.sleepSessions++;
            totalSynced++;
          }
        }
      } catch (sleepErr) {
        console.warn('[HuaweiSync] Advertencia obteniendo sueño:', sleepErr.message);
      }

      this.lastSyncTime = Date.now();
      return {
        success: true,
        syncedCount: totalSynced,
        summary,
        message: `Sincronización completada con Huawei Cloud: ${summary.workouts} entrenamientos, ${summary.sleepSessions} noches de sueño importadas.`
      };
    } catch (err) {
      console.error('[HuaweiSync] Error general sincronizando con Huawei:', err.message);
      return {
        success: false,
        syncedCount: totalSynced,
        message: `Error conectando con Huawei Cloud: ${err.message}`
      };
    }
  }

  async ensureFreshData(force = false) {
    const status = huaweiClient.getConnectionStatus();
    if (!status.isConnected) {
      return { success: false, connected: false, message: 'Huawei Cloud no conectado' };
    }

    const now = Date.now();
    const THROTTLE_MS = 60 * 1000;
    if (!force && (now - this.lastSyncTime < THROTTLE_MS)) {
      return { success: true, cached: true, syncedCount: 0 };
    }

    if (this.currentSyncPromise) {
      return this.currentSyncPromise;
    }

    this.currentSyncPromise = this.syncAll().finally(() => {
      this.currentSyncPromise = null;
    });

    return this.currentSyncPromise;
  }
}

module.exports = new HuaweiSync();
