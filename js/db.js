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

export async function save(store, record) {
  const existing = await getOne(store, record.id);
  const now = new Date().toISOString();
  const saved = {
    ...record,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    deleted: record.deleted ?? false,
  };
  const transaction = db.transaction(store, 'readwrite');
  transaction.objectStore(store).put(saved);
  await transactionDone(transaction);
  window.dispatchEvent(new Event('datachange'));
  return saved;
}

export async function remove(store, id) {
  const record = await getOne(store, id);
  return save(store, { ...record, deleted: true });
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
