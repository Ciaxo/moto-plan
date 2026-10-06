import { nouns, plural } from '../lib/format.js';
import { ordered } from '../lib/order.js';
import { matches } from '../lib/search.js';
import { element, icon, screenHeader, select } from '../ui/elements.js';

const emptyText = 'Baza wiedzy składa się z pytań i odpowiedzi w kategoriach. '
  + 'Dodaj pierwsze pytanie.';
let phrase = '';
let categoryId = '';

export function renderKnowledge(data) {
  const categories = ordered(data.categories);
  const questions = categoryQuestions(categories, data.questions);
  const eyebrow = `${plural(questions.length, nouns.questions)} · ${countKnown(questions)} umiem`;
  const screen = document.createDocumentFragment();
  screen.append(screenHeader('Baza wiedzy', { eyebrow }));
  if (questions.length === 0) {
    screen.append(messageCard(emptyText));
    return screen;
  }
  if (!categories.some((category) => category.id === categoryId)) {
    categoryId = '';
  }
  const titles = new Map(categories.map((category) => [category.id, category.title]));
  const summary = element('div', 'knowledge-summary');
  const results = element('div');
  // Typing redraws only the results, so the search field keeps its cursor.
  const update = () => {
    const inCategory = categoryId
      ? questions.filter((question) => question.categoryId === categoryId)
      : questions;
    summary.replaceChildren(...summaryParts(inCategory));
    const found = inCategory.filter((question) => matches(question, phrase));
    results.replaceChildren(questionList(found, titles));
  };
  update();
  screen.append(
    searchField(update),
    categorySelect(categories, questions, update),
    summary,
    results,
  );
  return screen;
}

function categoryQuestions(categories, questions) {
  const live = ordered(questions);
  return categories.flatMap(({ id }) => live.filter((question) => question.categoryId === id));
}

function countKnown(questions) {
  return questions.filter((question) => question.known).length;
}

function messageCard(text) {
  const card = element('section', 'card');
  card.append(element('p', null, text));
  return card;
}

function searchField(update) {
  const input = Object.assign(element('input', 'input'), {
    type: 'search',
    value: phrase,
    placeholder: 'Szukaj w pytaniach',
  });
  input.setAttribute('aria-label', 'Szukaj w pytaniach');
  input.dataset.id = 'search';
  input.addEventListener('input', () => {
    phrase = input.value;
    update();
  });
  const box = element('label', 'search');
  box.append(input, icon('search'));
  return box;
}

function categorySelect(categories, questions, update) {
  const options = categories.map((category) => {
    const count = questions.filter((question) => question.categoryId === category.id).length;
    return [category.id, `${category.title} (${count})`];
  });
  const chooser = select('category', [['', 'Wszystkie kategorie'], ...options], categoryId);
  const input = chooser.querySelector('select');
  input.setAttribute('aria-label', 'Kategoria');
  input.dataset.id = 'category';
  input.addEventListener('change', () => {
    categoryId = input.value;
    update();
  });
  return chooser;
}

function summaryParts(questions) {
  const known = countKnown(questions);
  const bar = element('progress', 'progress');
  // A max of 0 is ignored, so a category without questions shows an empty bar.
  bar.max = questions.length;
  bar.value = known;
  bar.setAttribute('aria-label', 'Pytania, które umiem');
  const counts = element('p', 'knowledge-counts');
  counts.append(
    element('span', null, `Umiem ${known}`),
    element('span', null, `Nie wiem ${questions.length - known}`),
  );
  return [bar, counts];
}

function questionList(questions, titles) {
  if (questions.length === 0) {
    return messageCard('Nic nie znaleziono');
  }
  const list = element('ul', 'card list');
  for (const question of questions) {
    list.append(questionRow(question, titles.get(question.categoryId)));
  }
  return list;
}

function questionRow(question, category) {
  const mark = element('span', question.known ? 'status-mark status-mark-known' : 'status-mark');
  mark.setAttribute('aria-hidden', 'true');
  if (question.known) {
    mark.append(icon('check'));
  }
  const text = element('span', 'question-text');
  text.append(
    element('span', 'row-title', question.question),
    element('span', 'row-meta', `${category} · ${question.known ? 'umiem' : 'nie wiem'}`),
  );
  const link = element('a', 'row-main question-link');
  link.href = `#/wiedza/${encodeURIComponent(question.id)}`;
  link.dataset.id = `question-${question.id}`;
  link.append(mark, text, icon('chevron-right'));
  const row = element('li', 'row');
  row.append(link);
  return row;
}
