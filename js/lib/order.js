export function ordered(records) {
  return records
    .filter((record) => !record.deleted)
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

export function nextOrder(records) {
  return Math.max(0, ...records.map((record) => record.order)) + 1;
}
