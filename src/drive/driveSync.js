const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

class DriveSync {
  constructor() {
    this.drive = null;
    this.isInitialized = false;
    this.rootFolderId = config.GOOGLE_DRIVE_FOLDER_ID;
    this.lastSyncTime = 0;
    this.currentSyncPromise = null;
  }

  init() {
    if (this.isInitialized) return true;
    if (!fs.existsSync(config.KEY_FILE_PATH)) {
      console.warn(`[DriveSync] No existe vertex_key.json en ${config.KEY_FILE_PATH}, sincronización de Drive omitida.`);
      return false;
    }

    try {
      const auth = new google.auth.GoogleAuth({
        keyFilename: config.KEY_FILE_PATH,
        scopes: ['https://www.googleapis.com/auth/drive.readonly']
      });
      this.drive = google.drive({ version: 'v3', auth });
      this.isInitialized = true;
      return true;
    } catch (err) {
      console.warn('[DriveSync] Error inicializando auth de Google Drive:', err.message);
      return false;
    }
  }

  async downloadFileStream(fileId, destPath) {
    const tempPath = `${destPath}.tmp_${Date.now()}`;
    const fileStream = fs.createWriteStream(tempPath);
    const downloadRes = await this.drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream' }
    );
    return new Promise((resolve, reject) => {
      downloadRes.data
        .pipe(fileStream)
        .on('finish', () => {
          try {
            if (fs.existsSync(destPath)) {
              fs.unlinkSync(destPath);
            }
            fs.renameSync(tempPath, destPath);
            resolve();
          } catch (renameErr) {
            try {
              fs.copyFileSync(tempPath, destPath);
              fs.unlinkSync(tempPath);
              resolve();
            } catch (copyErr) {
              reject(copyErr);
            }
          }
        })
        .on('error', (err) => {
          if (fs.existsSync(tempPath)) {
            try { fs.unlinkSync(tempPath); } catch (e) {}
          }
          reject(err);
        });
    });
  }

  getTargetSubfolderForFile(fileName) {
    const lower = fileName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const ext = path.extname(fileName).toLowerCase();

    // Detección exhaustiva de actividades / entrenamientos / deportes
    if (
      lower.includes('actividad') || 
      lower.includes('ejercicio') || 
      lower.includes('walking') || 
      lower.includes('caminata') || 
      lower.includes('paseo') ||
      lower.includes('running') || 
      lower.includes('carrera') || 
      lower.includes('cycling') || 
      lower.includes('ciclismo') || 
      lower.includes('bici') || 
      lower.includes('swimming') || 
      lower.includes('natacion') || 
      lower.includes('generic') || 
      lower.includes('workout') || 
      lower.includes('entrenamiento') || 
      lower.includes('deporte') ||
      ['.tcx', '.fit', '.gpx', '.kml'].includes(ext)
    ) {
      return 'Health Sync Actividades';
    }

    if (lower.includes('sueno') || lower.includes('sleep')) return 'Health Sync Sueño';
    if (lower.includes('frecuencia') || lower.includes('cardiaca') || lower.includes('heart') || lower.includes('pulso')) return 'Health Sync Frecuencia cardíaca';
    if (lower.includes('paso') || lower.includes('step')) return 'Health Sync Pasos';
    if (lower.includes('oxigeno') || lower.includes('saturacion') || lower.includes('spo2') || lower.includes('oxygen')) return 'Health Sync Saturación de oxígeno';
    if (lower.includes('peso') || lower.includes('weight') || lower.includes('composicion') || lower.includes('grasa')) return 'Health Sync Peso';
    return null;
  }

  sanitizeFileName(name) {
    return name.replace(/[<>:"/\\|?*]/g, '_');
  }

  async ensureFreshData(force = false) {
    const now = Date.now();
    const THROTTLE_MS = 60 * 1000; // 60 segundos de validez antes de consultar Drive de nuevo
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

  async syncAll() {
    if (!this.init()) {
      return { success: false, syncedCount: 0, message: 'Credenciales de Google Drive no disponibles en el servidor.' };
    }

    let syncedCount = 0;
    try {
      // 1. Buscar todas las carpetas compartidas o accesibles en Google Drive
      const folderListRes = await this.drive.files.list({
        q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });

      const allFoundFolders = folderListRes.data.files || [];
      let foldersToSync = allFoundFolders.filter(f => {
        const lower = f.name.toLowerCase();
        return lower.includes('health') || lower.includes('sync') || lower.includes('sueño') ||
               lower.includes('sueno') || lower.includes('frecuencia') || lower.includes('paso') ||
               lower.includes('oxigeno') || lower.includes('actividad') || lower.includes('peso') ||
               lower.includes('walking') || lower.includes('caminata') || lower.includes('ejercicio') ||
               lower.includes('entrenamiento') || lower.includes('deporte') || lower.includes('huawei');
      });

      // Si además existe rootFolderId específico y no está en la lista, comprobarlo
      if (this.rootFolderId && !foldersToSync.some(f => f.id === this.rootFolderId)) {
        try {
          const rootMeta = await this.drive.files.get({
            fileId: this.rootFolderId,
            fields: 'id, name',
            supportsAllDrives: true
          });
          if (rootMeta.data) {
            foldersToSync.push(rootMeta.data);
          }
        } catch (e) {}
      }

      if (foldersToSync.length === 0) {
        return {
          success: false,
          syncedCount: 0,
          message: '⚠️ La carpeta de Google Drive no está compartida con la cuenta del bot.\n\nPara solucionarlo en 30 segundos:\n1. Abre Google Drive (en tu móvil o PC).\n2. Busca la carpeta de Health Sync (donde se guardan los CSV de Huawei).\n3. Clic derecho o 3 puntos ➔ Compartir.\n4. Agrega este correo:\n`vertex-api-user@inteligencia-508502.iam.gserviceaccount.com`\n(como Lector o Editor) y dale Guardar.\n\nLuego vuelve a Telegram y presiona /sync.'
        };
      }

      console.log(`[DriveSync] Sincronizando ${foldersToSync.length} carpetas de salud:`, foldersToSync.map(f => f.name));

      for (let i = 0; i < foldersToSync.length; i++) {
        const folder = foldersToSync[i];
        let folderName = folder.name;
        if (!folderName.startsWith('Health Sync') && this.getTargetSubfolderForFile(folderName)) {
          folderName = this.getTargetSubfolderForFile(folderName);
        }

        const localTargetDir = path.join(config.HEALTH_DATA_DIR, folderName);
        if (!fs.existsSync(localTargetDir)) {
          fs.mkdirSync(localTargetDir, { recursive: true });
        }

        // Listar archivos dentro de la carpeta
        const filesRes = await this.drive.files.list({
          q: `'${folder.id}' in parents and trashed = false`,
          fields: 'files(id, name, mimeType, modifiedTime, size)',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true
        });

        const files = filesRes.data.files || [];
        for (const f of files) {
          if (f.mimeType === 'application/vnd.google-apps.folder') {
            // Si es una subcarpeta dentro de la carpeta principal, agregarla a la cola
            if (!foldersToSync.some(x => x.id === f.id)) {
              foldersToSync.push(f);
            }
            continue;
          }

          const safeName = this.sanitizeFileName(f.name);
          const targetSub = this.getTargetSubfolderForFile(f.name) || folderName;
          const fileTargetDir = path.join(config.HEALTH_DATA_DIR, targetSub);
          if (!fs.existsSync(fileTargetDir)) {
            fs.mkdirSync(fileTargetDir, { recursive: true });
          }
          const destPath = path.join(fileTargetDir, safeName);
          const remoteSize = parseInt(f.size, 10);
          const remoteTime = f.modifiedTime ? new Date(f.modifiedTime).getTime() : 0;
          let shouldDownload = false;

          if (!fs.existsSync(destPath)) {
            shouldDownload = true;
          } else {
            const stat = fs.statSync(destPath);
            if (stat.size === 0) {
              shouldDownload = true;
            } else if (!isNaN(remoteSize) && remoteSize !== stat.size) {
              shouldDownload = true;
            } else if (remoteTime && remoteTime > stat.mtimeMs + 5000) {
              shouldDownload = true;
            }
          }

          if (shouldDownload) {
            try {
              await this.downloadFileStream(f.id, destPath);
              syncedCount++;
              console.log(`[DriveSync] Actualizado: ${folderName}/${safeName} (${f.size} bytes)`);
            } catch (dlErr) {
              console.warn(`[DriveSync] Error descargando ${f.name}:`, dlErr.message);
            }
          }
        }
      }

      this.lastSyncTime = Date.now();
      return {
        success: true,
        syncedCount,
        message: `Sincronización completada con Google Drive. ${syncedCount} archivos nuevos o actualizados.`
      };
    } catch (err) {
      console.warn('[DriveSync] No se pudo sincronizar Drive:', err.message);
      let userMsg = err.message;
      if (err.message.includes('has not been used') || err.message.includes('disabled')) {
        userMsg = 'La API de Google Drive está desactivada en tu proyecto de Google Cloud (inteligencia-508502).\n\nActívala en 1 clic visitando:\nhttps://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=293106166812';
      }
      return {
        success: false,
        syncedCount: 0,
        message: userMsg
      };
    }
  }
}

module.exports = new DriveSync();

