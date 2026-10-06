import { plural } from '../js/lib/format.js';
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

showResults();
