import { loadAll, save } from './db.js';
import { SCHEMA_VERSION } from './lib/backup.js';
import { localDate } from './lib/dates.js';
import { element } from './ui/elements.js';

export async function exportBackup() {
  const now = new Date();
  const exportedAt = now.toISOString();
  // Saved first, so the file carries its own date and restoring it does not look like no backup.
  await save('settings', { id: 'lastExportAt', value: exportedAt });
  const backup = {
    app: 'moto-plan',
    type: 'backup',
    schemaVersion: SCHEMA_VERSION,
    exportedAt,
    data: await loadAll(),
  };
  download(`moto-plan-${localDate(now)}.json`, JSON.stringify(backup, null, 2));
}

function download(name, text) {
  const link = element('a');
  // Not revoked: a browser may read the URL only after click() returns, and the file is small.
  link.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  link.download = name;
  link.click();
}
