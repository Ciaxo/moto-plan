import { formatDate, localDate } from '../js/lib/dates.js';
import { formatAmount, plural } from '../js/lib/format.js';
import { editRecord, mergePack, validatePack } from '../js/lib/pack.js';
import {
  currentStage, isClosed, nextOrder, nextSteps, planStages, progress,
} from '../js/lib/plan.js';
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

showResults();
