const STORES = [
  'stages', 'steps', 'categories', 'questions', 'goals', 'costs', 'deposits', 'settings',
];

let db;

export async function openDatabase() {
  const opening = indexedDB.open('moto-plan', 1);
  opening.onupgradeneeded = () => {
    for (const store of STORES) {
      opening.result.createObjectStore(store, { keyPath: 'id' });
    }
  };
  db = await requestDone(opening);
}

export function getAll(store) {
  return requestDone(db.transaction(store).objectStore(store).getAll());
}

export function getOne(store, id) {
  return requestDone(db.transaction(store).objectStore(store).get(id));
}

export async function loadAll() {
  const lists = await Promise.all(STORES.map((store) => getAll(store)));
  return Object.fromEntries(STORES.map((store, index) => [store, lists[index]]));
}

export async function saveAll(changes) {
  const now = new Date().toISOString();
  const transaction = db.transaction(STORES, 'readwrite');
  for (const { store, record } of changes) {
    const records = transaction.objectStore(store);
    const reading = records.get(record.id);
    // A request made in a success handler keeps the transaction open, so all writes commit at once.
    reading.onsuccess = () => {
      records.put({
        ...record,
        createdAt: reading.result?.createdAt ?? now,
        updatedAt: now,
        deleted: record.deleted ?? false,
      });
    };
  }
  await transactionDone(transaction);
  window.dispatchEvent(new Event('datachange'));
}

export function save(store, record) {
  return saveAll([{ store, record }]);
}

export async function remove(store, id) {
  const record = await getOne(store, id);
  return save(store, { ...record, deleted: true });
}

// Unlike saveAll, keeps the dates from the backup file, because they decide later merges.
export async function restoreAll(changes, replace) {
  const transaction = db.transaction(STORES, 'readwrite');
  // Cleared in the same transaction, so a failed write leaves the old data in place.
  if (replace) {
    for (const store of STORES) {
      transaction.objectStore(store).clear();
    }
  }
  for (const { store, record } of changes) {
    transaction.objectStore(store).put(record);
  }
  await transactionDone(transaction);
  window.dispatchEvent(new Event('datachange'));
}

function requestDone(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// A write is only stored once the transaction commits; quota errors abort it after put succeeds.
function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
  });
}
