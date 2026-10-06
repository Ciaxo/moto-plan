import { daysBetween, localDate } from './dates.js';

const REMINDER_DAYS = 7;

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
