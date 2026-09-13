const { google } = require('googleapis');
const path = require('path');

const auth = new google.auth.GoogleAuth({
  keyFilename: path.resolve('vertex_key.json'),
  scopes: ['https://www.googleapis.com/auth/drive.readonly']
});

const drive = google.drive({ version: 'v3', auth });

const folders = [
  { id: '1d-MRNNeeronXp383_ZJagqVl7sNhGv1q', hint: 'Folder 1' },
  { id: '1SZ4wCA9Zg1Nx8jrekU7yLQocw3VJBzHf', hint: 'Folder 2' },
  { id: '1EQ5QABZocL9fmx-hE78zs4NcxE3xD00z', hint: 'Folder 3' },
  { id: '12F-KkQbmeeJ1wm5p1XrBIBzbl8zqqF3G', hint: 'Folder 4' },
  { id: '1_X0jsGe1Ov8YhceCiCBsM4K4rOHyuPAf', hint: 'Folder 5' }
];

async function check() {
  for (const f of folders) {
    try {
      const res = await drive.files.get({ fileId: f.id, fields: 'id, name, mimeType', supportsAllDrives: true });
      console.log('Access SUCCESS:', res.data.name, 'ID:', f.id);
      const list = await drive.files.list({
        q: `'${f.id}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, modifiedTime)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });
      console.log('   Files count:', list.data.files.length);
      list.data.files.slice(0, 5).forEach(x => console.log('     -', x.name));
    } catch (e) {
      console.log('Access FAIL for', f.id, ':', e.message);
    }
  }
}
check();
