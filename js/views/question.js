import { save } from '../db.js';
import { textBlocks } from '../lib/text.js';
import { backLink, element, icon, screenHeader } from '../ui/elements.js';

const statuses = [[false, 'Nie wiem'], [true, 'Umiem']];

export function renderQuestion(data, entered, id) {
  const question = data.questions.find((record) => record.id === id && !record.deleted);
  if (!question) {
    location.replace('#/wiedza');
    return document.createDocumentFragment();
  }
  const category = data.categories.find((record) => record.id === question.categoryId);
  const header = screenHeader(question.question, { eyebrow: category?.title });
  header.classList.add('question-header');
  const screen = document.createDocumentFragment();
  screen.append(
    backLink('#/wiedza', 'Baza wiedzy'),
    header,
    statusSwitch(question),
    answerCard(question.answer),
  );
  if (question.sourceUrl.startsWith('https://')) {
    screen.append(sourceCard(question));
  }
  return screen;
}

function statusSwitch(question) {
  const options = element('fieldset', 'segmented segmented-accent');
  options.setAttribute('aria-label', 'Status');
  for (const [known, label] of statuses) {
    const input = Object.assign(element('input'), {
      type: 'radio',
      name: 'known',
      value: String(known),
      checked: known === question.known,
    });
    input.dataset.id = `known-${known}`;
    const option = element('label', 'segment');
    option.append(input, label);
    options.append(option);
  }
  options.addEventListener('change', (event) => {
    const known = event.target.value === 'true';
    save('questions', { ...question, known, knownAt: known ? new Date().toISOString() : null });
  });
  return options;
}

function answerCard(answer) {
  const card = element('section', 'card answer');
  card.append(element('h2', 'card-title', 'Odpowiedź'));
  const blocks = textBlocks(answer);
  if (blocks.length === 0) {
    card.append(element('p', 'answer-empty', 'Odpowiedź jeszcze nie jest uzupełniona.'));
  }
  for (const block of blocks) {
    card.append(block.type === 'list' ? answerList(block.items) : element('p', null, block.text));
  }
  return card;
}

function answerList(items) {
  const list = element('ul');
  for (const item of items) {
    list.append(element('li', null, item));
  }
  return list;
}

function sourceCard(question) {
  const text = element('span', 'source-text');
  text.append(
    element('span', 'source-label', 'Źródło'),
    element('span', 'source-title', question.sourceTitle || question.sourceUrl),
  );
  const link = element('a', 'card source');
  link.href = question.sourceUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.append(icon('link'), text);
  return link;
}
