const FORMAT_VERSION = 1;
const GROUPS = ['once', 'yearly', 'hidden'];
const DATE = /^(\d{4}(-\d{2}(-\d{2})?)?)?$/;

const COLLECTIONS = {
  stages: { name: 'Etapy', label: 'Etap', fields: ['order', 'title', 'period', 'headline'] },
  steps: {
    name: 'Kroki',
    label: 'Krok',
    fields: ['stageId', 'order', 'title', 'dueDate', 'cost', 'hint'],
  },
  categories: { name: 'Kategorie', label: 'Kategoria', fields: ['order', 'title'] },
  questions: {
    name: 'Pytania',
    label: 'Pytanie',
    fields: ['categoryId', 'order', 'question', 'answer', 'sourceTitle', 'sourceUrl'],
  },
  goals: { name: 'Cele', label: 'Cel', fields: ['order', 'title'] },
  costs: {
    name: 'Koszty',
    label: 'Koszt',
    fields: ['order', 'title', 'amount', 'group', 'goalId', 'date'],
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

function installedPacks(data) {
  return data.settings.find((record) => record.id === 'packs')?.value ?? {};
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
