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

  async syncAll() {
    if (!this.init()) {
      return { success: false, syncedCount: 0, message: 'Credenciales de Google Drive no disponibles.' };
    }

    let syncedCount = 0;
    try {
      // Find subfolders in Root Folder with a timeout
      const folderListPromise = this.drive.files.list({
        q: `'${this.rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout conectando a Google Drive (5s)')), 5000)
      );

      const res = await Promise.race([folderListPromise, timeoutPromise]);
      const folders = res.data.files || [];

      for (const folder of folders) {
        const localTargetDir = path.join(config.HEALTH_DATA_DIR, folder.name);
        if (!fs.existsSync(localTargetDir)) {
          fs.mkdirSync(localTargetDir, { recursive: true });
        }

        // List files in subfolder
        const filesRes = await this.drive.files.list({
          q: `'${folder.id}' in parents and trashed = false`,
          fields: 'files(id, name, modifiedTime)',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true
        });

        const files = filesRes.data.files || [];
        for (const f of files) {
          const destPath = path.join(localTargetDir, f.name);
          // Only download if doesn't exist or size is 0
          if (!fs.existsSync(destPath) || fs.statSync(destPath).size === 0) {
            try {
              const fileStream = fs.createWriteStream(destPath);
              const downloadRes = await this.drive.files.get(
                { fileId: f.id, alt: 'media', supportsAllDrives: true },
                { responseType: 'stream' }
              );
              await new Promise((resolve, reject) => {
                downloadRes.data
                  .pipe(fileStream)
                  .on('finish', resolve)
                  .on('error', reject);
              });
              syncedCount++;
              console.log(`[DriveSync] Descargado: ${folder.name}/${f.name}`);
            } catch (dlErr) {
              console.warn(`[DriveSync] Error descargando ${f.name}:`, dlErr.message);
            }
          }
        }
      }

      return {
        success: true,
        syncedCount,
        message: `Sincronización completada. ${syncedCount} archivos nuevos descargados.`
      };
    } catch (err) {
      console.warn('[DriveSync] No se pudo sincronizar Drive:', err.message);
      return {
        success: false,
        syncedCount: 0,
        message: err.message.includes('has not been used') || err.message.includes('disabled')
          ? 'La API de Google Drive no está habilitada en tu proyecto de Google Cloud.'
          : err.message
      };
    }
  }
}

module.exports = new DriveSync();
