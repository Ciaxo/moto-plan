import { backupAge, mergeBackup, needsBackup, validateBackup } from '../js/lib/backup.js';
import {
  budgetSettings, budgetTotals, currentGoal, depositsByDate, forecast, goalFunding,
} from '../js/lib/budget.js';
import { addMonths, daysBetween, formatDate, formatMonth, localDate } from '../js/lib/dates.js';
import { formatAmount, plural, pluralForm } from '../js/lib/format.js';
import { nextOrder } from '../js/lib/order.js';
import { buildPack, editRecord, mergePack, validatePack } from '../js/lib/pack.js';
import {
  currentStage, isClosed, nextSteps, planStages, progress,
} from '../js/lib/plan.js';
import { matches } from '../js/lib/search.js';
import { textBlocks } from '../js/lib/text.js';
import { element, screenHeader } from '../js/ui/elements.js';

const results = [];

function test(name, run) {
  try {
    run();
    results.push({ name, error: null });
  } catch (error) {
    results.push({ name, error: error.message });
  }
}

function assertEqual(actual, expected) {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) {
    throw new Error(`oczekiwano ${expectedText}, jest ${actualText}`);
  }
}

function showResults() {
  const failed = results.filter((result) => result.error).length;
  const summary = failed === 0
    ? `Wszystkie przechodzą: ${results.length}`
    : `Nie przechodzi ${failed} z ${results.length}`;
  const list = element('section', 'card');
  for (const { name, error } of results) {
    list.append(element('p', null, error ? `✗ ${name}: ${error}` : `✓ ${name}`));
  }
  document.querySelector('main').append(screenHeader('Testy', { eyebrow: summary }), list);
}

const steps = ['krok', 'kroki', 'kroków'];

test('odmiana: 1, 2–4 i 5 lub więcej', () => {
  assertEqual(
    [0, 1, 2, 4, 5].map((count) => plural(count, steps)),
    ['0 kroków', '1 krok', '2 kroki', '4 kroki', '5 kroków'],
  );
});

test('odmiana: 12–14 jak 5, a 22–24 i 122 jak 2', () => {
  assertEqual(
    [12, 14, 21, 22, 24, 25, 112, 122].map((count) => plural(count, steps)),
    ['12 kroków', '14 kroków', '21 kroków', '22 kroki', '24 kroki', '25 kroków', '112 kroków',
      '122 kroki'],
  );
});

test('odmiana w dopełniaczu, po „z" i „około"', () => {
  const genitive = ['kroku', 'kroków', 'kroków'];
  assertEqual(
    [1, 2, 34].map((count) => plural(count, genitive)),
    ['1 kroku', '2 kroków', '34 kroków'],
  );
});

test('odmiana: sama forma, bez liczby, dla przymiotnika po rzeczowniku', () => {
  const closed = ['zamknięty', 'zamknięte', 'zamkniętych'];
  assertEqual(
    [0, 1, 2, 5, 22].map((count) => pluralForm(count, closed)),
    ['zamkniętych', 'zamknięty', 'zamknięte', 'zamkniętych', 'zamknięte'],
  );
});

test('kwoty: pełne złote, odstęp także w liczbach czterocyfrowych', () => {
  assertEqual(
    [59, 1200, 30000].map((amount) => formatAmount(amount).replaceAll(' ', ' ')),
    ['59 zł', '1 200 zł', '30 000 zł'],
  );
});

const today = '2026-10-05';

test('daty: dzień i miesiąc w bieżącym roku bez roku', () => {
  assertEqual(
    [formatDate('2026-11-03', today), formatDate('2026-12', today)],
    ['3 listopada', 'grudzień'],
  );
});

test('daty: dzień i miesiąc w innym roku z rokiem', () => {
  assertEqual(
    [formatDate('2027-02-12', today), formatDate('2027-05', today)],
    ['12 lutego 2027', 'maj 2027'],
  );
});

test('daty: sam rok i pusty termin bez zmian', () => {
  assertEqual([formatDate('2027', today), formatDate('', today)], ['2027', '']);
});

test('daty: data lokalna, a nie UTC', () => {
  assertEqual(
    [localDate(new Date(2026, 0, 1, 0, 15)), localDate(new Date(2026, 9, 5, 23, 45))],
    ['2026-01-01', '2026-10-05'],
  );
});

test('daty: pełne dni między datami, także przez zmianę czasu i rok', () => {
  assertEqual(
    [
      daysBetween('2026-10-05', '2026-10-05'),
      daysBetween('2026-10-04', '2026-10-05'),
      daysBetween('2026-10-24', '2026-10-26'),
      daysBetween('2026-12-31', '2027-01-01'),
    ],
    [0, 1, 2, 1],
  );
});

test('daty: miesiąc z rokiem w mianowniku, także w bieżącym roku', () => {
  assertEqual(
    [formatMonth('2026-10'), formatMonth('2027-01'), formatMonth('2028-06')],
    ['październik 2026', 'styczeń 2027', 'czerwiec 2028'],
  );
});

test('daty: przesunięcie miesiąca, także przez koniec roku', () => {
  assertEqual(
    [
      addMonths('2026-10', 0),
      addMonths('2026-10', 2),
      addMonths('2026-10', 3),
      addMonths('2026-10', 12),
      addMonths('2026-12', 1),
      addMonths('2026-10', 27),
    ],
    ['2026-10', '2026-12', '2027-01', '2027-10', '2027-01', '2029-01'],
  );
});

const createdAt = '2026-10-01T10:00:00.000Z';

function stage(id, order, fields = {}) {
  return { id, order, createdAt, deleted: false, ...fields };
}

function step(id, stageId, order, fields = {}) {
  return { id, stageId, order, dueDate: '', done: false, createdAt, deleted: false, ...fields };
}

function doneSteps(done, total) {
  return Array.from({ length: total }, (_, index) => ({ done: index < done }));
}

function ids(records) {
  return records.map((record) => record.id);
}

test('plan: postęp zaokrąglony w dół, 100% dopiero gdy wszystko zrobione', () => {
  const results = [[2, 3], [29, 100], [199, 200], [5, 5], [0, 0]]
    .map(([done, total]) => progress(doneSteps(done, total)));
  assertEqual(results, [66, 29, 99, 100, 0]);
});

test('plan: etap zamknięty, gdy ma kroki i wszystkie są zrobione', () => {
  assertEqual(
    [isClosed([]), isClosed(doneSteps(2, 3)), isClosed(doneSteps(3, 3))],
    [false, false, true],
  );
});

test('plan: etapy i kroki według order, a przy równym według createdAt, bez usuniętych', () => {
  const plan = planStages(
    [
      stage('c', 2, { createdAt: '2026-10-02T10:00:00.000Z' }),
      stage('b', 2),
      stage('a', 1),
      stage('x', 1, { deleted: true }),
    ],
    [
      step('k2', 'a', 2),
      step('k1', 'a', 1),
      step('k3', 'a', 3, { deleted: true }),
      step('m1', 'b', 1),
    ],
  );
  assertEqual(
    plan.map((entry) => [entry.stage.id, ids(entry.steps)]),
    [['a', ['k1', 'k2']], ['b', ['m1']], ['c', []]],
  );
});

test('plan: bieżący etap to pierwszy niezamknięty, a gdy wszystkie są zamknięte, ostatni', () => {
  const stages = [stage('a', 1), stage('b', 2), stage('c', 3)];
  const current = (stepList) => currentStage(planStages(stages, stepList)).stage.id;
  const closedA = step('k1', 'a', 1, { done: true });
  const closedB = step('m1', 'b', 1, { done: true });
  assertEqual(
    [
      current([step('k1', 'a', 1), step('m1', 'b', 1)]),
      current([closedA, step('m1', 'b', 1)]),
      current([closedA, closedB]),
      current([closedA, closedB, step('n1', 'c', 1, { done: true })]),
    ],
    ['a', 'b', 'c', 'c'],
  );
});

test('plan: nowy etap albo krok trafia na koniec', () => {
  assertEqual([nextOrder([]), nextOrder([stage('a', 2), stage('b', 5)])], [1, 6]);
});

test('plan: najbliższe kroki według końca terminu, potem etapu i kroku', () => {
  const stages = [stage('a', 1), stage('b', 2)];
  const stepList = [
    step('rok', 'a', 1, { dueDate: '2027' }),
    step('luty-a', 'a', 2, { dueDate: '2027-02' }),
    step('bez', 'a', 3),
    step('zrobiony', 'a', 4, { dueDate: '2026-11', done: true }),
    step('dzien', 'b', 1, { dueDate: '2027-02-12' }),
    step('luty-b', 'b', 2, { dueDate: '2027-02' }),
  ];
  assertEqual(ids(nextSteps(planStages(stages, stepList))), ['dzien', 'luty-a', 'luty-b']);
  const undated = [step('bez', 'a', 1), step('rok', 'a', 2, { dueDate: '2027' })];
  assertEqual(ids(nextSteps(planStages(stages, undated))), ['rok', 'bez']);
});

function emptyData() {
  return {
    stages: [], steps: [], categories: [], questions: [],
    goals: [], costs: [], deposits: [], settings: [],
  };
}

function smallPack() {
  return {
    app: 'moto-plan',
    type: 'content',
    formatVersion: 1,
    packId: 'test',
    title: 'Paczka testowa',
    version: 2,
    stages: [{ id: 's1', title: 'Teoria' }],
    steps: [{ id: 'k1', stageId: 's1', title: 'Egzamin', dueDate: '2027-02', cost: 59 }],
    categories: [{ id: 'c1', title: 'Przepisy' }],
    questions: [{ id: 'q1', categoryId: 'c1', question: 'Czym jest OC?' }],
    goals: [{ id: 'g1', title: 'Prawo jazdy' }],
    costs: [{ id: 'x1', title: 'Kurs', amount: 3500, group: 'once', goalId: 'g1' }],
  };
}

test('paczka: poprawna paczka nie ma błędów', () => {
  assertEqual(validatePack(smallPack(), emptyData()), []);
});

test('paczka: plik, który nie jest paczką treści, daje jeden błąd', () => {
  assertEqual(
    validatePack({ app: 'moto-plan', type: 'backup' }, emptyData()),
    ['To nie jest paczka treści Moto Plan.'],
  );
});

test('paczka: odrzuca paczkę bez packId', () => {
  const pack = smallPack();
  delete pack.packId;
  assertEqual(validatePack(pack, emptyData()), ['Paczka nie ma identyfikatora.']);
});

test('paczka: odrzuca wersję starszą od wczytanej, tę samą przepuszcza', () => {
  const data = emptyData();
  data.settings.push({ id: 'packs', value: { test: { title: 'Paczka testowa', version: 3 } } });
  const pack = smallPack();
  assertEqual(validatePack(pack, data), ['Wczytana jest już nowsza wersja tej paczki (3).']);
  pack.version = 3;
  assertEqual(validatePack(pack, data), []);
});

test('paczka: odrzuca powtórzony identyfikator', () => {
  const pack = smallPack();
  pack.stages.push({ id: 's1', title: 'Jazdy' });
  assertEqual(validatePack(pack, emptyData()), ['Etapy: identyfikator „s1" powtarza się.']);
});

test('paczka: odrzuca odwołanie do nieistniejącego etapu', () => {
  const pack = smallPack();
  pack.steps[0].stageId = 's9';
  assertEqual(
    validatePack(pack, emptyData()),
    ['Krok k1: etap „s9" nie istnieje w paczce ani w aplikacji.'],
  );
});

test('paczka: odwołanie do etapu z aplikacji przechodzi, do usuniętego nie', () => {
  const pack = smallPack();
  pack.steps[0].stageId = 'own';
  const data = emptyData();
  data.stages.push({ id: 'own', title: 'Własny', deleted: false });
  assertEqual(validatePack(pack, data), []);
  data.stages[0].deleted = true;
  assertEqual(
    validatePack(pack, data),
    ['Krok k1: etap „own" nie istnieje w paczce ani w aplikacji.'],
  );
});

test('paczka: odrzuca kwotę z groszami', () => {
  const pack = smallPack();
  pack.costs[0].amount = 3500.5;
  assertEqual(
    validatePack(pack, emptyData()),
    ['Koszt x1: kwota musi być liczbą całkowitą większą od zera.'],
  );
});

test('paczka: odrzuca brak tytułu, zły termin i brak rodzaju kosztu', () => {
  const pack = smallPack();
  delete pack.steps[0].title;
  pack.steps[0].dueDate = '02.2027';
  delete pack.costs[0].group;
  assertEqual(validatePack(pack, emptyData()), [
    'Krok k1: brakuje tytułu.',
    'Krok k1: termin musi być pusty albo mieć postać RRRR, RRRR-MM lub RRRR-MM-DD.',
    'Koszt x1: brakuje rodzaju.',
  ]);
});

test('paczka: odrzuca kolekcję, która nie jest listą, i pozycję bez identyfikatora', () => {
  const pack = smallPack();
  pack.stages.push({ title: 'Jazdy' });
  pack.costs = {};
  assertEqual(validatePack(pack, emptyData()), [
    'Etapy: pozycja 2 nie ma identyfikatora.',
    'Koszty muszą być listą.',
  ]);
});

function imported(pack) {
  const data = emptyData();
  for (const { store, record } of mergePack(pack, data).changes) {
    data[store].push(record);
  }
  return data;
}

function stepChange(changes) {
  return changes.find((change) => change.store === 'steps').record;
}

test('łączenie: nowy rekord dostaje pochodzenie z paczki i domyślne pola', () => {
  const { changes, counts } = mergePack(smallPack(), emptyData());
  assertEqual(counts, { added: 6, updated: 0, unchanged: 0, skipped: 0 });
  assertEqual(stepChange(changes), {
    id: 'k1', stageId: 's1', order: 1, title: 'Egzamin', dueDate: '2027-02', cost: 59, hint: '',
    origin: 'pack', packId: 'test', userModified: false, done: false, doneAt: null, note: '',
  });
});

test('łączenie: pomija pola spoza listy pól treści', () => {
  const pack = smallPack();
  Object.assign(pack.steps[0], { done: true, note: 'z paczki', _uwaga: 'pomiń' });
  const record = stepChange(mergePack(pack, emptyData()).changes);
  assertEqual([record.done, record.note, '_uwaga' in record], [false, '', false]);
});

test('łączenie: zmienia tylko pola treści, pola użytkownika zostają', () => {
  const data = imported(smallPack());
  Object.assign(data.steps[0], { done: true, note: 'Moja notatka', createdAt: '2026-10-01' });
  const pack = smallPack();
  pack.steps[0].title = 'Egzamin teoretyczny';
  const { changes, counts } = mergePack(pack, data);
  assertEqual(counts, { added: 0, updated: 1, unchanged: 5, skipped: 0 });
  const record = stepChange(changes);
  assertEqual(
    [record.title, record.done, record.note, record.createdAt],
    ['Egzamin teoretyczny', true, 'Moja notatka', '2026-10-01'],
  );
});

test('łączenie: rekordów bez zmian nie zapisuje', () => {
  assertEqual(mergePack(smallPack(), imported(smallPack())), {
    changes: [],
    counts: { added: 0, updated: 0, unchanged: 6, skipped: 0 },
  });
});

test('łączenie: nie rusza rekordu zmienionego przez użytkownika', () => {
  const data = imported(smallPack());
  Object.assign(data.steps[0], { title: 'Mój tytuł', userModified: true });
  const pack = smallPack();
  pack.steps[0].title = 'Egzamin teoretyczny';
  assertEqual(mergePack(pack, data), {
    changes: [],
    counts: { added: 0, updated: 0, unchanged: 5, skipped: 1 },
  });
});

test('łączenie: nie przywraca usuniętego rekordu', () => {
  const data = imported(smallPack());
  data.questions[0].deleted = true;
  const pack = smallPack();
  pack.questions[0].question = 'Czym jest OC i AC?';
  assertEqual(mergePack(pack, data), {
    changes: [],
    counts: { added: 0, updated: 0, unchanged: 5, skipped: 1 },
  });
});

test('łączenie: pomija nowy krok usuniętego etapu', () => {
  const data = emptyData();
  data.stages.push({ id: 's1', title: 'Teoria', deleted: true });
  const { changes, counts } = mergePack(smallPack(), data);
  assertEqual(counts, { added: 4, updated: 0, unchanged: 0, skipped: 2 });
  assertEqual(
    changes.map((change) => change.store),
    ['categories', 'questions', 'goals', 'costs'],
  );
});

test('edycja: zmiana treści kroku z paczki ustawia userModified, zmiana notatki nie', () => {
  const packStep = imported(smallPack()).steps[0];
  assertEqual(
    [
      editRecord('steps', packStep, { title: 'Egzamin teoretyczny' }).userModified,
      editRecord('steps', packStep, { note: 'Zabrać dowód' }).userModified,
    ],
    [true, false],
  );
});

test('edycja: zapis bez zmian nie daje nic do zapisania', () => {
  const packStep = imported(smallPack()).steps[0];
  const { stageId, title, dueDate, cost, note } = packStep;
  assertEqual(editRecord('steps', packStep, { stageId, title, dueDate, cost, note }), null);
});

test('edycja: własny krok nie dostaje userModified', () => {
  const own = { ...step('k9', 's1', 1), title: 'Mój krok', origin: 'user', userModified: false };
  assertEqual(editRecord('steps', own, { title: 'Mój nowy krok' }).userModified, false);
});

const savedAt = '2026-10-01T12:00:00.000Z';
const ownInfo = { packId: 'own', title: 'Moja paczka', version: 2 };

// Content as the app keeps it: loaded from a pack, then ticked off, edited, deleted and added to.
function appData() {
  const data = imported(smallPack());
  const own = { origin: 'user', packId: null, userModified: false };
  Object.assign(data.steps[0], {
    title: 'Egzamin teoretyczny',
    userModified: true,
    done: true,
    doneAt: savedAt,
    note: 'Zabrać dowód',
  });
  Object.assign(data.questions[0], { known: true, knownAt: savedAt, notes: 'Obowiązkowe' });
  data.steps.push({
    ...own, id: 'k2', stageId: 's1', order: 2, title: 'Zapisać się na kurs', dueDate: '',
    cost: null, hint: '', done: false, doneAt: null, note: '',
  });
  data.questions.push(
    {
      ...own, id: 'q2', categoryId: 'c1', order: 2, question: 'Ile kosztuje AC?', answer: 'Zależy.',
      sourceTitle: '', sourceUrl: '', known: false, knownAt: null, notes: '', notesAt: null,
    },
    { ...own, id: 'q3', categoryId: 'c1', order: 3, question: 'Usunięte', deleted: true },
  );
  data.goals.push({ ...own, id: 'g2', order: 2, title: 'Mój cel' });
  data.costs.push({
    ...own, id: 'x2', order: 2, title: 'Kask', amount: 1200, group: 'once', goalId: 'g2',
    date: '2027', status: 'paid', paidAt: savedAt, note: 'Na wyprzedaży',
  });
  data.deposits.push({ ...own, id: 'd1', date: '2026-10-01', amount: 500, goalId: null, note: '' });
  data.settings.push({ id: 'goalMode', value: 'split' });
  for (const record of Object.values(data).flat()) {
    Object.assign(record, { createdAt: savedAt, updatedAt: savedAt, deleted: !!record.deleted });
  }
  return data;
}

test('eksport paczki: tylko pola treści nieusuniętych rekordów, bez wpłat i ustawień', () => {
  assertEqual(buildPack(appData(), ownInfo), {
    app: 'moto-plan',
    type: 'content',
    formatVersion: 1,
    packId: 'own',
    title: 'Moja paczka',
    version: 2,
    stages: [{ id: 's1', order: 1, title: 'Teoria', period: '', headline: '' }],
    steps: [
      {
        id: 'k1', stageId: 's1', order: 1, title: 'Egzamin teoretyczny', dueDate: '2027-02',
        cost: 59, hint: '',
      },
      {
        id: 'k2', stageId: 's1', order: 2, title: 'Zapisać się na kurs', dueDate: '', cost: null,
        hint: '',
      },
    ],
    categories: [{ id: 'c1', order: 1, title: 'Przepisy' }],
    questions: [
      {
        id: 'q1', categoryId: 'c1', order: 1, question: 'Czym jest OC?', answer: '',
        sourceTitle: '', sourceUrl: '',
      },
      {
        id: 'q2', categoryId: 'c1', order: 2, question: 'Ile kosztuje AC?', answer: 'Zależy.',
        sourceTitle: '', sourceUrl: '',
      },
    ],
    goals: [{ id: 'g1', order: 1, title: 'Prawo jazdy' }, { id: 'g2', order: 2, title: 'Mój cel' }],
    costs: [
      { id: 'x1', order: 1, title: 'Kurs', amount: 3500, group: 'once', goalId: 'g1', date: '' },
      {
        id: 'x2', order: 2, title: 'Kask', amount: 1200, group: 'once', goalId: 'g2', date: '2027',
      },
    ],
  });
});

test('eksport paczki: kroki etapami, bez kroków usuniętego etapu', () => {
  const data = appData();
  data.stages.push(
    { id: 's2', order: 2, title: 'Jazdy', createdAt: savedAt, deleted: false },
    { id: 's9', order: 3, title: 'Usunięty', createdAt: savedAt, deleted: true },
  );
  data.steps.push(
    { id: 'k3', stageId: 's2', order: 1, title: 'Jazda', createdAt: savedAt, deleted: false },
    { id: 'k9', stageId: 's9', order: 1, title: 'Bez etapu', createdAt: savedAt, deleted: false },
  );
  assertEqual(buildPack(data, ownInfo).steps.map((record) => record.id), ['k1', 'k2', 'k3']);
});

test('eksport paczki: tam i z powrotem przez pustą aplikację daje tę samą treść', () => {
  const pack = buildPack(appData(), ownInfo);
  assertEqual(validatePack(pack, emptyData()), []);
  const copy = imported(pack);
  assertEqual(buildPack(copy, ownInfo), pack);
  const helmet = copy.costs.find((record) => record.id === 'x2');
  assertEqual(
    [copy.goals.find((record) => record.id === helmet.goalId).title, helmet.status, helmet.note],
    ['Mój cel', 'planned', ''],
  );
  assertEqual(
    [copy.steps[0].done, copy.steps[0].note, copy.questions[0].notes, copy.deposits.length],
    [false, '', '', 0],
  );
});

// Noon UTC falls on the same local date in nearly every time zone.
function backupData(lastExportAt, changedAt, fields = {}) {
  const data = emptyData();
  if (lastExportAt) {
    data.settings.push({ id: 'lastExportAt', value: lastExportAt, updatedAt: lastExportAt });
  }
  if (changedAt) {
    data.steps.push({ id: 'k1', updatedAt: changedAt, deleted: false, ...fields });
  }
  return data;
}

const eightDaysAgo = '2026-09-27T12:00:00.000Z';

test('kopia: wiek ostatniej kopii w dniach, bez kopii null', () => {
  assertEqual(
    [
      backupAge(emptyData(), today),
      backupAge(backupData('2026-10-05T12:00:00.000Z'), today),
      backupAge(backupData('2026-09-25T12:00:00.000Z'), today),
    ],
    [null, 0, 10],
  );
});

test('kopia: bez kopii przypomina, gdy w bazie jest cokolwiek', () => {
  assertEqual(
    [needsBackup(emptyData(), today), needsBackup(backupData(null, eightDaysAgo), today)],
    [false, true],
  );
});

test('kopia: przypomina dopiero po 7 dniach i tylko przy zmianie po kopii', () => {
  const sevenDaysAgo = '2026-09-28T12:00:00.000Z';
  const later = '2026-09-30T12:00:00.000Z';
  assertEqual(
    [
      needsBackup(backupData(sevenDaysAgo, later), today),
      needsBackup(backupData(eightDaysAgo, later), today),
      needsBackup(backupData(eightDaysAgo, '2026-09-20T12:00:00.000Z'), today),
      needsBackup(backupData(eightDaysAgo, later, { deleted: true }), today),
    ],
    [false, true, false, true],
  );
});

test('kopia: wpis z datą równą kopii i sam zapis lastExportAt nie przypominają', () => {
  const ownRecord = backupData(eightDaysAgo);
  ownRecord.settings[0].updatedAt = '2026-09-27T12:00:00.005Z';
  assertEqual(
    [needsBackup(backupData(eightDaysAgo, eightDaysAgo), today), needsBackup(ownRecord, today)],
    [false, false],
  );
});

const oldDate = '2026-10-01T12:00:00.000Z';
const newDate = '2026-10-03T12:00:00.000Z';
const damagedBackup = ['Plik kopii jest uszkodzony.'];

function saved(id, updatedAt, fields = {}) {
  return { id, createdAt: oldDate, updatedAt, deleted: false, ...fields };
}

function backupFile(stores = {}) {
  return {
    app: 'moto-plan',
    type: 'backup',
    schemaVersion: 1,
    exportedAt: newDate,
    data: { ...emptyData(), ...stores },
  };
}

function localData(stores) {
  return { ...emptyData(), ...stores };
}

test('kopia: poprawny plik nie ma błędów', () => {
  const file = backupFile({ steps: [saved('k1', newDate)], settings: [saved('theme', newDate)] });
  assertEqual(validateBackup(file, emptyData()), []);
});

test('kopia: odrzuca wyższy schemaVersion, a brak schemaVersion uznaje za uszkodzenie', () => {
  const newer = backupFile();
  newer.schemaVersion = 99;
  const missing = backupFile();
  delete missing.schemaVersion;
  assertEqual(
    [validateBackup(newer, emptyData()), validateBackup(missing, emptyData())],
    [
      ['Ta kopia pochodzi z nowszej wersji aplikacji. Zaktualizuj aplikację i spróbuj ponownie.'],
      damagedBackup,
    ],
  );
});

test('kopia: odrzuca daty, które nie są dokładnie datami ISO', () => {
  const withDate = (updatedAt) => validateBackup(
    backupFile({ steps: [saved('k1', updatedAt)] }),
    emptyData(),
  );
  const badExport = backupFile();
  badExport.exportedAt = 'wczoraj';
  assertEqual(
    [
      withDate('zzz'),
      withDate('2026-10-03'),
      withDate('2026-10-03T12:00:00Z'),
      validateBackup(badExport, emptyData()),
    ],
    [damagedBackup, damagedBackup, damagedBackup, damagedBackup],
  );
});

test('kopia: odrzuca brak magazynu, pusty rekord, rekord bez id i zły deleted', () => {
  const noStore = backupFile();
  delete noStore.data.deposits;
  const noId = backupFile({ steps: [saved('', newDate)] });
  const badDeleted = backupFile({ steps: [saved('k1', newDate, { deleted: 'nie' })] });
  const notRecord = backupFile({ steps: [null] });
  assertEqual(
    [noStore, noId, badDeleted, notRecord].map((file) => validateBackup(file, emptyData())),
    [damagedBackup, damagedBackup, damagedBackup, damagedBackup],
  );
});

test('kopia: wpis spoza aplikacji jest dodawany, a nowszy z pliku zastępuje lokalny', () => {
  const file = backupFile({ steps: [saved('k1', newDate, { done: true }), saved('k2', oldDate)] });
  const data = localData({ steps: [saved('k1', oldDate, { done: false })] });
  assertEqual(mergeBackup(file, data), {
    changes: [
      { store: 'steps', record: saved('k1', newDate, { done: true }) },
      { store: 'steps', record: saved('k2', oldDate) },
    ],
    counts: { added: 1, newer: 1, unchanged: 0 },
  });
});

test('kopia: przy równych datach zostaje wpis lokalny', () => {
  const file = backupFile({ steps: [saved('k1', newDate, { done: true })] });
  const data = localData({ steps: [saved('k1', newDate, { done: false })] });
  assertEqual(mergeBackup(file, data), {
    changes: [],
    counts: { added: 0, newer: 0, unchanged: 1 },
  });
});

test('kopia: nowszy wpis lokalny zostaje i liczy się jako bez zmian', () => {
  const file = backupFile({ steps: [saved('k1', oldDate, { done: false })] });
  const data = localData({ steps: [saved('k1', newDate, { done: true })] });
  assertEqual(mergeBackup(file, data), {
    changes: [],
    counts: { added: 0, newer: 0, unchanged: 1 },
  });
});

test('kopia: nowsze usunięcie z pliku przechodzi do aplikacji', () => {
  const file = backupFile({ questions: [saved('q1', newDate, { deleted: true })] });
  const data = localData({ questions: [saved('q1', oldDate)] });
  assertEqual(mergeBackup(file, data).changes, [
    { store: 'questions', record: saved('q1', newDate, { deleted: true }) },
  ]);
});

test('kopia: liczniki zgadzają się ze zmianami we wszystkich magazynach', () => {
  const file = backupFile({
    stages: [saved('s1', oldDate), saved('s2', oldDate)],
    steps: [saved('k1', newDate), saved('k2', oldDate), saved('k3', oldDate)],
    settings: [saved('theme', newDate), saved('lastExportAt', oldDate)],
  });
  const data = localData({
    stages: [saved('s1', oldDate)],
    steps: [saved('k1', oldDate), saved('k2', newDate)],
    settings: [saved('theme', oldDate), saved('lastExportAt', newDate)],
  });
  const { changes, counts } = mergeBackup(file, data);
  assertEqual(
    [counts, changes.map(({ store, record }) => `${store}/${record.id}`)],
    [
      { added: 2, newer: 2, unchanged: 3 },
      ['stages/s2', 'steps/k1', 'steps/k3', 'settings/theme'],
    ],
  );
});

function question(fields) {
  return { question: '', answer: '', notes: '', ...fields };
}

test('wyszukiwanie: bez rozróżniania wielkości liter i polskich znaków', () => {
  const chain = question({ question: 'Jak smarować i napinać łańcuch?' });
  assertEqual(
    ['lancuch', 'ŁAŃCUCH', 'napinac', 'Smarować'].map((phrase) => matches(chain, phrase)),
    [true, true, true, true],
  );
});

test('wyszukiwanie: każde słowo frazy, w dowolnej kolejności', () => {
  const insurance = question({ question: 'Czym różni się OC od AC?' });
  assertEqual(
    ['oc ac', 'ac oc', '  oc   ac ', 'oc kask'].map((phrase) => matches(insurance, phrase)),
    [true, true, true, false],
  );
});

test('wyszukiwanie: także w odpowiedzi i notatkach', () => {
  const record = question({
    question: 'Co zrobić po kolizji?',
    answer: 'Zrób zdjęcia.',
    notes: 'Numer do ubezpieczyciela',
  });
  assertEqual(
    ['zdjecia', 'ubezpieczyciela', 'kolizji zdjecia'].map((phrase) => matches(record, phrase)),
    [true, true, true],
  );
});

test('wyszukiwanie: słowo nie łączy końca jednego pola z początkiem następnego', () => {
  assertEqual(matches(question({ question: 'kask', answer: 'opona' }), 'kasko'), false);
});

test('wyszukiwanie: pusta fraza i same spacje pasują do każdego pytania', () => {
  const record = question({ question: 'Co zrobić po kolizji?' });
  assertEqual([matches(record, ''), matches(record, '   ')], [true, true]);
});

const paragraph = (text) => ({ type: 'paragraph', text });
const list = (...items) => ({ type: 'list', items });

test('odpowiedź: akapity rozdziela pusta linia, także z samymi spacjami', () => {
  assertEqual(textBlocks('Pierwszy.\n\nDrugi.\n   \nTrzeci.'), [
    paragraph('Pierwszy.'), paragraph('Drugi.'), paragraph('Trzeci.'),
  ]);
});

test('odpowiedź: pojedyncza nowa linia zostaje w tym samym akapicie', () => {
  assertEqual(textBlocks('Linia pierwsza\nLinia druga'), [
    paragraph('Linia pierwsza\nLinia druga'),
  ]);
});

test('odpowiedź: lista zaraz po akapicie, a pusta linia ją kończy', () => {
  assertEqual(textBlocks('Przed zakupem sprawdź:\n- zakres\n- udział własny\n\nPotem kup.'), [
    paragraph('Przed zakupem sprawdź:'), list('zakres', 'udział własny'), paragraph('Potem kup.'),
  ]);
});

test('odpowiedź: tekst zostaje dosłowny, a myślnik bez spacji nie tworzy listy', () => {
  assertEqual(textBlocks('<b>test</b>\n-bez spacji'), [paragraph('<b>test</b>\n-bez spacji')]);
});

test('odpowiedź: pusta odpowiedź i końce linii z Windows', () => {
  assertEqual([textBlocks(''), textBlocks('A\r\n\r\n- b')], [[], [paragraph('A'), list('b')]]);
});

function cost(id, goalId, amount, group, fields = {}) {
  return { id, goalId, amount, group, status: 'planned', createdAt, deleted: false, ...fields };
}

function deposit(id, amount, fields = {}) {
  return { id, amount, goalId: null, date: '2026-10-01', createdAt, deleted: false, ...fields };
}

// Costs of data/example-pack.json, with only the fields the calculations read.
const exampleCosts = [
  cost('ex-cost-kurs', 'ex-goal-1', 3500, 'once'),
  cost('ex-cost-badanie', 'ex-goal-1', 200, 'once'),
  cost('ex-cost-egzaminy', 'ex-goal-1', 400, 'once'),
  cost('ex-cost-odziez', 'ex-goal-1', 4000, 'once'),
  cost('ex-cost-motocykl', 'ex-goal-2', 20000, 'once'),
  cost('ex-cost-rejestracja', 'ex-goal-2', 120, 'once'),
  cost('ex-cost-zabezpieczenia', 'ex-goal-2', 800, 'once'),
  cost('ex-cost-oc', 'ex-goal-2', 600, 'yearly'),
  cost('ex-cost-rezerwa', 'ex-goal-2', 380, 'hidden'),
];
const autoDeposit = deposit('d-auto', 12000);

test('budżet: przykład z paczki z wpłatą 12 000 zł', () => {
  assertEqual(budgetTotals(exampleCosts, [autoDeposit]), {
    collected: 12000, spent: 0, total: 30000, onAccount: 12000, missing: 18000, percent: 40,
  });
});

test('budżet: do sumy wchodzą koszty każdego rodzaju, także roczne i ukryte', () => {
  const costs = [
    cost('a', 'g', 1000, 'once'),
    cost('b', 'g', 600, 'yearly'),
    cost('c', 'g', 400, 'hidden'),
  ];
  assertEqual(budgetTotals(costs, []).total, 2000);
});

test('budżet: zebrane to wszystkie wpłaty, także przypisane do celu', () => {
  const deposits = [autoDeposit, deposit('d-goal', 2000, { goalId: 'ex-goal-2' })];
  assertEqual(budgetTotals(exampleCosts, deposits).collected, 14000);
});

test('budżet: zapłacenie kosztu zmienia wydane i na koncie, a zebrane nie', () => {
  const costs = exampleCosts.map((record) => (record.id === 'ex-cost-kurs'
    ? { ...record, status: 'paid' }
    : record));
  const { collected, spent, onAccount } = budgetTotals(costs, [autoDeposit]);
  assertEqual([collected, spent, onAccount], [12000, 3500, 8500]);
});

test('budżet: na koncie ujemne, gdy zapłacono więcej, niż wpłacono', () => {
  const costs = [cost('a', 'g', 3500, 'once', { status: 'paid' })];
  assertEqual(budgetTotals(costs, [deposit('d', 1000)]).onAccount, -2500);
});

test('budżet: postęp w dół, najwyżej 100%, brakuje nie mniej niż 0', () => {
  const totals = (collected, total) => budgetTotals(
    [cost('a', 'g', total, 'once')],
    [deposit('d', collected)],
  );
  assertEqual(
    [[1, 3], [29, 100], [199, 200], [200, 200], [31000, 30000]].map(([collected, total]) => {
      const { percent, missing } = totals(collected, total);
      return [percent, missing];
    }),
    [[33, 2], [29, 71], [99, 1], [100, 0], [100, 0]],
  );
});

test('budżet: bez kosztów suma i postęp są zerowe', () => {
  assertEqual(budgetTotals([], [autoDeposit]), {
    collected: 12000, spent: 0, total: 0, onAccount: 12000, missing: 0, percent: 0,
  });
});

test('budżet: usunięte koszty i wpłaty się nie liczą', () => {
  const costs = [...exampleCosts, cost('x', 'ex-goal-1', 5000, 'once', { deleted: true })];
  const deposits = [autoDeposit, deposit('y', 7000, { deleted: true })];
  const { collected, total } = budgetTotals(costs, deposits);
  assertEqual([collected, total], [12000, 30000]);
});

test('budżet: ustawienia z bazy, a bez rekordów wartości domyślne', () => {
  const settings = [
    { id: 'goalMode', value: 'split' },
    { id: 'monthlyDeposit', value: 1500 },
  ];
  assertEqual(
    [budgetSettings(settings), budgetSettings([])],
    [{ goalMode: 'split', monthlyDeposit: 1500 }, { goalMode: 'single', monthlyDeposit: 0 }],
  );
});

test('prognoza: przykład z paczki, październik 2027 za 12 miesięcy', () => {
  const totals = budgetTotals(exampleCosts, [autoDeposit]);
  assertEqual(forecast(totals, 1500, today), { months: 12, month: '2027-10' });
});

test('prognoza: niepełny miesiąc liczy się jako cały', () => {
  const totals = budgetTotals(exampleCosts, [autoDeposit]);
  assertEqual(
    [1600, 3000, 18000].map((monthlyDeposit) => forecast(totals, monthlyDeposit, today)),
    [
      { months: 12, month: '2027-10' },
      { months: 6, month: '2027-04' },
      { months: 1, month: '2026-11' },
    ],
  );
});

test('prognoza: bez miesięcznej wpłaty, przy 0 i bez rekordu w bazie', () => {
  const totals = budgetTotals(exampleCosts, [autoDeposit]);
  const missing = budgetSettings([]).monthlyDeposit;
  assertEqual(
    [forecast(totals, 0, today), forecast(totals, missing, today)],
    [{ message: 'Ustaw miesięczną wpłatę' }, { message: 'Ustaw miesięczną wpłatę' }],
  );
});

test('prognoza: bez kosztów i po osiągnięciu celu, także bez miesięcznej wpłaty', () => {
  const reached = budgetTotals(exampleCosts, [deposit('d', 30000)]);
  assertEqual(
    [forecast(budgetTotals([], []), 1500, today), forecast(reached, 0, today)],
    [{ message: 'Dodaj koszty' }, { message: 'Cel osiągnięty' }],
  );
});

function goal(id, order, fields = {}) {
  return { id, order, title: id, createdAt, deleted: false, ...fields };
}

const exampleGoals = [goal('ex-goal-1', 1), goal('ex-goal-2', 2)];

function funding(goals, costs, deposits) {
  return goalFunding(goals, costs, deposits).map((entry) => {
    const { value, funded, percent, covered } = entry;
    return { id: entry.goal.id, value, funded, percent, covered };
  });
}

test('cele: przykład z paczki, wpłata automatyczna pokrywa cel 1, reszta idzie do celu 2', () => {
  assertEqual(funding(exampleGoals, exampleCosts, [autoDeposit]), [
    { id: 'ex-goal-1', value: 8100, funded: 8100, percent: 100, covered: true },
    { id: 'ex-goal-2', value: 21900, funded: 3900, percent: 17, covered: false },
  ]);
});

test('cele: wpłata ręczna do celu 2 podnosi tylko cel 2', () => {
  const deposits = [autoDeposit, deposit('d-goal', 2000, { goalId: 'ex-goal-2' })];
  assertEqual(
    funding(exampleGoals, exampleCosts, deposits).map(({ funded }) => funded),
    [8100, 5900],
  );
});

test('cele: jedyna wpłata ręcznie do celu 2, cel 1 bez zasilenia', () => {
  const deposits = [deposit('d-goal', 5000, { goalId: 'ex-goal-2' })];
  assertEqual(
    funding(exampleGoals, exampleCosts, deposits).map(({ funded }) => funded),
    [0, 5000],
  );
});

test('cele: ręczna wpłata ponad wartość celu nie przechodzi na inne cele', () => {
  const deposits = [
    deposit('d-goal', 10000, { goalId: 'ex-goal-1' }),
    deposit('d-auto', 1000),
  ];
  assertEqual(funding(exampleGoals, exampleCosts, deposits), [
    { id: 'ex-goal-1', value: 8100, funded: 10000, percent: 100, covered: true },
    { id: 'ex-goal-2', value: 21900, funded: 1000, percent: 4, covered: false },
  ]);
});

test('cele: ostatni cel bierze całą resztę puli, pasek najwyżej 100%', () => {
  assertEqual(funding(exampleGoals, exampleCosts, [deposit('d', 40000)]), [
    { id: 'ex-goal-1', value: 8100, funded: 8100, percent: 100, covered: true },
    { id: 'ex-goal-2', value: 21900, funded: 31900, percent: 100, covered: true },
  ]);
});

test('cele: cel bez kosztów nie bierze z puli, chyba że jest ostatni, i nie jest pokryty', () => {
  const goals = [goal('a', 1), goal('b', 2), goal('c', 3)];
  const costs = [cost('x', 'a', 1000, 'once'), cost('y', 'c', 2000, 'once')];
  const lastEmpty = [goal('a', 1), goal('b', 2)];
  assertEqual(
    [
      funding(goals, costs, [deposit('d', 1500)]),
      funding(lastEmpty, costs.slice(0, 1), [deposit('d', 1500)]),
    ],
    [
      [
        { id: 'a', value: 1000, funded: 1000, percent: 100, covered: true },
        { id: 'b', value: 0, funded: 0, percent: 0, covered: false },
        { id: 'c', value: 2000, funded: 500, percent: 25, covered: false },
      ],
      [
        { id: 'a', value: 1000, funded: 1000, percent: 100, covered: true },
        { id: 'b', value: 0, funded: 500, percent: 0, covered: false },
      ],
    ],
  );
});

test('cele: według order, koszty celu według order, wydane, bez usuniętych', () => {
  const goals = [goal('b', 2), goal('a', 1), goal('gone', 0, { deleted: true })];
  const costs = [
    cost('a-2', 'a', 300, 'yearly', { order: 2, status: 'paid' }),
    cost('a-1', 'a', 200, 'once', { order: 1, status: 'paid' }),
    cost('a-3', 'a', 900, 'once', { order: 3, deleted: true, status: 'paid' }),
    cost('b-1', 'b', 400, 'hidden', { order: 4 }),
  ];
  const result = goalFunding(goals, costs, [deposit('d', 100)]);
  assertEqual(
    result.map((entry) => [entry.goal.id, ids(entry.costs), entry.value, entry.spent]),
    [['a', ['a-1', 'a-2'], 500, 500], ['b', ['b-1'], 400, 0]],
  );
});

test('cele: bieżący to pierwszy niepokryty z kosztami, a gdy wszystkie pokryte, brak', () => {
  const goals = [goal('a', 1), goal('b', 2), goal('c', 3)];
  const costs = [cost('x', 'a', 1000, 'once'), cost('y', 'c', 2000, 'once')];
  const current = (amount) => {
    const entry = currentGoal(goalFunding(goals, costs, [deposit('d', amount)]));
    return entry?.goal.id;
  };
  assertEqual([current(0), current(1000), current(3000)], ['a', 'c', undefined]);
});

test('wpłaty: od najnowszej, przy tej samej dacie później dodana wyżej, bez usuniętych', () => {
  const deposits = [
    deposit('a', 100, { date: '2026-09-15' }),
    deposit('b', 100, { date: '2026-10-01', createdAt: '2026-10-01T08:00:00.000Z' }),
    deposit('c', 100, { date: '2026-10-01', createdAt: '2026-10-02T08:00:00.000Z' }),
    deposit('d', 100, { date: '2026-10-03', deleted: true }),
    deposit('e', 100, { date: '2025-12-31' }),
  ];
  assertEqual(ids(depositsByDate(deposits)), ['c', 'b', 'a', 'e']);
});

showResults();
