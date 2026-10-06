import { daysBetween, localDate } from './dates.js';

export const SCHEMA_VERSION = 1;
const REMINDER_DAYS = 7;
const damaged = 'Plik kopii jest uszkodzony.';
const newer = 'Ta kopia pochodzi z nowszej wersji aplikacji. '
  + 'Zaktualizuj aplikację i spróbuj ponownie.';

// The store names come from the local data, so the list of stores lives only in db.js.
export function validateBackup(backup, data) {
  if (!Number.isInteger(backup.schemaVersion)) {
    return [damaged];
  }
  if (backup.schemaVersion > SCHEMA_VERSION) {
    return [newer];
  }
  const valid = isIsoDate(backup.exportedAt) && Object.keys(data).every((store) => {
    const records = backup.data?.[store];
    return Array.isArray(records) && records.every(isRecord);
  });
  return valid ? [] : [damaged];
}

function isRecord(record) {
  return typeof record?.id === 'string' && record.id !== ''
    && typeof record.deleted === 'boolean'
    && isIsoDate(record.createdAt)
    && isIsoDate(record.updatedAt);
}

// Only the exact toISOString() form: merging compares dates as text, so "zzz" would always win.
function isIsoDate(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
    && new Date(value).toISOString() === value;
}

export function mergeBackup(backup, data) {
  const changes = [];
  const counts = { added: 0, newer: 0, unchanged: 0 };
  for (const store of Object.keys(data)) {
    const local = new Map(data[store].map((record) => [record.id, record]));
    for (const record of backup.data[store]) {
      const outcome = mergeOutcome(record, local.get(record.id));
      counts[outcome] += 1;
      if (outcome !== 'unchanged') {
        changes.push({ store, record });
      }
    }
  }
  return { changes, counts };
}

function mergeOutcome(record, current) {
  if (!current) {
    return 'added';
  }
  // On equal dates the local record stays.
  return record.updatedAt > current.updatedAt ? 'newer' : 'unchanged';
}

export function backupAge(data, today) {
  const last = lastExport(data);
  return last ? daysBetween(localDate(new Date(last)), today) : null;
}

export function needsBackup(data, today) {
  const age = backupAge(data, today);
  if (age !== null && age <= REMINDER_DAYS) {
    return false;
  }
  const last = lastExport(data);
  return Object.entries(data).some(([store, records]) => records.some((record) => {
    // Every export writes this record, so it would always look like a change.
    if (store === 'settings' && record.id === 'lastExportAt') {
      return false;
    }
    return !last || record.updatedAt > last;
  }));
}

function lastExport(data) {
  return data.settings.find((record) => record.id === 'lastExportAt')?.value;
}
