const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

class DriveSync {
  constructor() {
    this.drive = null;
    this.isInitialized = false;
    this.rootFolderId = config.GOOGLE_DRIVE_FOLDER_ID;
  }

  init() {
    if (this.isInitialized) return true;
    if (!fs.existsSync(config.KEY_FILE_PATH)) {
      console.warn('[DriveSync] No existe vertex_key.json, sincronización de Drive omitida.');
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
    const fileStream = fs.createWriteStream(destPath);
    const downloadRes = await this.drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream' }
    );
    return new Promise((resolve, reject) => {
      downloadRes.data
        .pipe(fileStream)
        .on('finish', resolve)
        .on('error', reject);
    });
  }

  getTargetSubfolderForFile(fileName) {
    const lower = fileName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (lower.includes('sueno')) return 'Health Sync Sueño';
    if (lower.includes('frecuencia') || lower.includes('cardiaca')) return 'Health Sync Frecuencia cardíaca';
    if (lower.includes('paso')) return 'Health Sync Pasos';
    if (lower.includes('actividad') || lower.includes('ejercicio')) return 'Health Sync Actividades';
    if (lower.includes('oxigeno') || lower.includes('saturacion')) return 'Health Sync Saturación de oxígeno';
    if (lower.includes('peso')) return 'Health Sync Peso';
    return null;
  }

  async syncAll() {
    if (!this.init()) {
      return { success: false, syncedCount: 0, message: 'Credenciales de Google Drive no disponibles en el servidor.' };
    }

    let syncedCount = 0;
    try {
      // 0. Validar acceso a la carpeta raíz o detectar carpeta compartida
      let targetFolderId = this.rootFolderId;
      let folderAccessible = false;

      try {
        await this.drive.files.get({
          fileId: targetFolderId,
          fields: 'id, name',
          supportsAllDrives: true
        });
        folderAccessible = true;
      } catch (accessErr) {
        // Si no se encuentra por ID fijo, buscar cualquier carpeta compartida con la cuenta
        try {
          const sharedRes = await this.drive.files.list({
            q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
            fields: 'files(id, name)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true
          });
          const sharedFolders = sharedRes.data.files || [];
          const healthFolder = sharedFolders.find(f => {
            const n = f.name.toLowerCase();
            return n.includes('health') || n.includes('sync') || n.includes('huawei');
          }) || sharedFolders[0];

          if (healthFolder) {
            targetFolderId = healthFolder.id;
            folderAccessible = true;
            console.log(`[DriveSync] Carpeta compartida detectada automáticamente: "${healthFolder.name}" (${healthFolder.id})`);
          }
        } catch (searchErr) {
          console.warn('[DriveSync] Error buscando carpetas compartidas:', searchErr.message);
        }
      }

      if (!folderAccessible) {
        return {
          success: false,
          syncedCount: 0,
          message: '⚠️ La carpeta de Google Drive no está compartida con la cuenta del bot.\n\nPara solucionarlo en 30 segundos:\n1. Abre Google Drive (en tu móvil o PC).\n2. Busca la carpeta de Health Sync (donde se guardan los CSV de Huawei).\n3. Clic derecho o 3 puntos ➔ Compartir.\n4. Agrega este correo:\n`vertex-api-user@inteligencia-508502.iam.gserviceaccount.com`\n(como Lector o Editor) y dale Guardar.\n\nLuego vuelve a Telegram y presiona /sync.'
        };
      }

      // 1. Obtener subcarpetas y archivos en la carpeta raíz accesible
      const listPromise = this.drive.files.list({
        q: `'${targetFolderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, modifiedTime, size)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout conectando a Google Drive (8s)')), 8000)
      );

      const res = await Promise.race([listPromise, timeoutPromise]);
      const items = res.data.files || [];

      const folders = items.filter(it => it.mimeType === 'application/vnd.google-apps.folder');
      const rootFiles = items.filter(it => it.mimeType !== 'application/vnd.google-apps.folder' && it.name.endsWith('.csv'));

      // Sincronizar archivos dentro de subcarpetas
      for (const folder of folders) {
        const localTargetDir = path.join(config.HEALTH_DATA_DIR, folder.name);
        if (!fs.existsSync(localTargetDir)) {
          fs.mkdirSync(localTargetDir, { recursive: true });
        }

        const filesRes = await this.drive.files.list({
          q: `'${folder.id}' in parents and trashed = false`,
          fields: 'files(id, name, modifiedTime, size)',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true
        });

        const files = filesRes.data.files || [];
        for (const f of files) {
          const destPath = path.join(localTargetDir, f.name);
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
              shouldDownload = true; // Health Sync agregó nuevas filas
            } else if (remoteTime && remoteTime > stat.mtimeMs + 5000) {
              shouldDownload = true; // El archivo remoto es más reciente
            }
          }

          if (shouldDownload) {
            try {
              await this.downloadFileStream(f.id, destPath);
              syncedCount++;
              console.log(`[DriveSync] Actualizado: ${folder.name}/${f.name}`);
            } catch (dlErr) {
              console.warn(`[DriveSync] Error descargando ${f.name}:`, dlErr.message);
            }
          }
        }
      }

      // Sincronizar archivos CSV directos en la raíz (si Health Sync no usó subcarpetas)
      for (const f of rootFiles) {
        const targetSub = this.getTargetSubfolderForFile(f.name);
        const localTargetDir = targetSub ? path.join(config.HEALTH_DATA_DIR, targetSub) : config.HEALTH_DATA_DIR;
        if (!fs.existsSync(localTargetDir)) {
          fs.mkdirSync(localTargetDir, { recursive: true });
        }

        const destPath = path.join(localTargetDir, f.name);
        const remoteSize = parseInt(f.size, 10);
        let shouldDownload = false;

        if (!fs.existsSync(destPath)) {
          shouldDownload = true;
        } else {
          const stat = fs.statSync(destPath);
          if (stat.size === 0 || (!isNaN(remoteSize) && remoteSize !== stat.size)) {
            shouldDownload = true;
          }
        }

        if (shouldDownload) {
          try {
            await this.downloadFileStream(f.id, destPath);
            syncedCount++;
            console.log(`[DriveSync] Actualizado desde raíz: ${f.name} -> ${targetSub || 'health_data'}`);
          } catch (dlErr) {
            console.warn(`[DriveSync] Error descargando ${f.name}:`, dlErr.message);
          }
        }
      }

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

