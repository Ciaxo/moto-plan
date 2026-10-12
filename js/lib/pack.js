import { ordered } from './order.js';

const FORMAT_VERSION = 1;
const GROUPS = ['once', 'yearly', 'hidden'];
const DATE = /^(\d{4}(-\d{2}(-\d{2})?)?)?$/;

const COLLECTIONS = {
  stages: { name: 'Etapy', label: 'Etap', fields: ['order', 'title', 'period', 'headline'] },
  steps: {
    name: 'Kroki',
    label: 'Krok',
    fields: ['stageId', 'order', 'title', 'dueDate', 'cost', 'hint'],
    userFields: { done: false, doneAt: null, note: '' },
  },
  categories: { name: 'Kategorie', label: 'Kategoria', fields: ['order', 'title'] },
  questions: {
    name: 'Pytania',
    label: 'Pytanie',
    fields: ['categoryId', 'order', 'question', 'answer', 'sourceTitle', 'sourceUrl'],
    userFields: { known: false, knownAt: null, notes: '', notesAt: null },
  },
  goals: { name: 'Cele', label: 'Cel', fields: ['order', 'title'] },
  costs: {
    name: 'Koszty',
    label: 'Koszt',
    fields: ['order', 'title', 'amount', 'group', 'goalId', 'date'],
    userFields: { status: 'planned', paidAt: null, note: '' },
  },
};

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value) => typeof value === 'string';
const isFilledText = (value) => isText(value) && value.trim() !== '';
const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;
const isDate = (value) => isText(value) && DATE.test(value);
const dateProblem = 'termin musi być pusty albo mieć postać RRRR, RRRR-MM lub RRRR-MM-DD';

const FIELDS = {
  order: { check: (value) => typeof value === 'number', problem: 'kolejność musi być liczbą' },
  title: { missing: 'tytułu', check: isFilledText, problem: 'tytuł musi być niepustym tekstem' },
  question: {
    missing: 'treści pytania',
    check: isFilledText,
    problem: 'treść pytania musi być niepustym tekstem',
  },
  period: { check: isText, problem: 'okres musi być tekstem' },
  headline: { check: isText, problem: 'nagłówek musi być tekstem' },
  hint: { check: isText, problem: 'podpowiedź musi być tekstem' },
  answer: { check: isText, problem: 'odpowiedź musi być tekstem' },
  sourceTitle: { check: isText, problem: 'tytuł źródła musi być tekstem' },
  sourceUrl: { check: isText, problem: 'adres źródła musi być tekstem' },
  dueDate: { check: isDate, problem: dateProblem },
  date: { check: isDate, problem: dateProblem },
  cost: {
    check: (value) => value === null || isPositiveInteger(value),
    problem: 'koszt musi być liczbą całkowitą większą od zera albo null',
  },
  amount: {
    missing: 'kwoty',
    check: isPositiveInteger,
    problem: 'kwota musi być liczbą całkowitą większą od zera',
  },
  group: {
    missing: 'rodzaju',
    check: (value) => GROUPS.includes(value),
    problem: 'rodzaj musi mieć wartość once, yearly albo hidden',
  },
  stageId: { missing: 'etapu', target: 'stages', name: 'etap' },
  categoryId: { missing: 'kategorii', target: 'categories', name: 'kategoria' },
  goalId: { missing: 'celu', target: 'goals', name: 'cel' },
};

export function validatePack(pack, data) {
  if (!isObject(pack) || pack.app !== 'moto-plan' || pack.type !== 'content') {
    return ['To nie jest paczka treści Moto Plan.'];
  }
  const ids = {
    stages: knownIds(pack, data, 'stages'),
    categories: knownIds(pack, data, 'categories'),
    goals: knownIds(pack, data, 'goals'),
  };
  const errors = packErrors(pack, data);
  for (const collection of Object.keys(COLLECTIONS)) {
    if (pack[collection] !== undefined) {
      errors.push(...collectionErrors(pack[collection], COLLECTIONS[collection], ids));
    }
  }
  return errors;
}

export function installedPacks(data) {
  return data.settings.find((record) => record.id === 'packs')?.value ?? {};
}

export function buildPack(data, { packId, title, version }) {
  const pack = {
    app: 'moto-plan',
    type: 'content',
    formatVersion: FORMAT_VERSION,
    packId,
    title,
    version,
  };
  // Parents come before their children in COLLECTIONS, so each parent list is ready when needed.
  for (const [collection, { fields }] of Object.entries(COLLECTIONS)) {
    const records = ordered(data[collection]);
    const link = fields.find((field) => FIELDS[field].target);
    // A record without its parent is not shown in the app and would make the pack invalid.
    const kept = link
      ? pack[FIELDS[link].target].flatMap((parent) => (
        records.filter((record) => record[link] === parent.id)
      ))
      : records;
    pack[collection] = kept.map((record, index) => contentOf(record, fields, index));
  }
  return pack;
}

function packErrors(pack, data) {
  const errors = [];
  if (!isFilledText(pack.packId)) {
    errors.push('Paczka nie ma identyfikatora.');
  }
  if (!isFilledText(pack.title)) {
    errors.push('Paczka nie ma nazwy.');
  }
  if (!Number.isInteger(pack.version)) {
    errors.push('Wersja paczki musi być liczbą całkowitą.');
  }
  if (pack.formatVersion > FORMAT_VERSION) {
    errors.push('Paczka ma nowszy format, niż obsługuje ta wersja aplikacji.');
  }
  const installed = installedPacks(data)[pack.packId];
  if (installed && pack.version < installed.version) {
    errors.push(`Wczytana jest już nowsza wersja tej paczki (${installed.version}).`);
  }
  return errors;
}

function knownIds(pack, data, collection) {
  const fromPack = Array.isArray(pack[collection])
    ? pack[collection].map((record) => record?.id)
    : [];
  const fromApp = data[collection].filter((record) => !record.deleted).map((record) => record.id);
  return new Set([...fromPack, ...fromApp]);
}

function collectionErrors(records, { name, label, fields }, ids) {
  if (!Array.isArray(records)) {
    return [`${name} muszą być listą.`];
  }
  const errors = [];
  const seen = new Set();
  records.forEach((record, index) => {
    if (!isObject(record)) {
      errors.push(`${name}: pozycja ${index + 1} nie jest obiektem.`);
      return;
    }
    if (!isFilledText(record.id)) {
      errors.push(`${name}: pozycja ${index + 1} nie ma identyfikatora.`);
      return;
    }
    if (seen.has(record.id)) {
      errors.push(`${name}: identyfikator „${record.id}" powtarza się.`);
    }
    seen.add(record.id);
    for (const problem of fieldProblems(record, fields, ids)) {
      errors.push(`${label} ${record.id}: ${problem}.`);
    }
  });
  return errors;
}

function fieldProblems(record, fields, ids) {
  const problems = [];
  for (const field of fields) {
    const rule = FIELDS[field];
    const value = record[field];
    if (value === undefined) {
      if (rule.missing) {
        problems.push(`brakuje ${rule.missing}`);
      }
    } else if (rule.target) {
      if (!ids[rule.target].has(value)) {
        problems.push(`${rule.name} „${value}" nie istnieje w paczce ani w aplikacji`);
      }
    } else if (!rule.check(value)) {
      problems.push(rule.problem);
    }
  }
  return problems;
}

export function mergePack(pack, data) {
  const changes = [];
  const counts = { added: 0, updated: 0, unchanged: 0, skipped: 0 };
  const deletedStages = new Set(
    data.stages.filter((stage) => stage.deleted).map((stage) => stage.id),
  );
  for (const collection of Object.keys(COLLECTIONS)) {
    const existing = new Map(data[collection].map((record) => [record.id, record]));
    (pack[collection] ?? []).forEach((record, index) => {
      const content = contentOf(record, COLLECTIONS[collection].fields, index);
      const current = existing.get(record.id);
      const merged = current
        ? mergeExisting(collection, content, current)
        : mergeNew(collection, content, pack.packId, deletedStages);
      counts[merged.outcome] += 1;
      if (merged.record) {
        changes.push({ store: collection, record: merged.record });
      }
    });
  }
  return { changes, counts };
}

function contentOf(record, fields, index) {
  const content = { id: record.id };
  for (const field of fields) {
    content[field] = record[field] ?? fallback(field, index);
  }
  return content;
}

function fallback(field, index) {
  if (field === 'order') {
    return index + 1;
  }
  if (field === 'cost') {
    return null;
  }
  return '';
}

function mergeNew(collection, content, packId, deletedStages) {
  // A step of a deleted stage would count towards progress without being shown anywhere.
  if (collection === 'steps' && deletedStages.has(content.stageId)) {
    return { outcome: 'skipped' };
  }
  const { userFields } = COLLECTIONS[collection];
  const record = { ...content, origin: 'pack', packId, userModified: false, ...userFields };
  return { outcome: 'added', record };
}

function mergeExisting(collection, content, current) {
  if (current.deleted || current.userModified) {
    return { outcome: 'skipped' };
  }
  // Rewriting an unchanged record would raise updatedAt and let it win a later backup merge.
  if (COLLECTIONS[collection].fields.every((field) => current[field] === content[field])) {
    return { outcome: 'unchanged' };
  }
  return { outcome: 'updated', record: { ...current, ...content } };
}

export function editRecord(collection, record, changes) {
  const edited = { ...record, ...changes };
  const changed = (field) => record[field] !== edited[field];
  if (!Object.keys(changes).some(changed)) {
    return null;
  }
  const contentChanged = record.origin === 'pack' && COLLECTIONS[collection].fields.some(changed);
  return { ...edited, userModified: record.userModified || contentChanged };
}
