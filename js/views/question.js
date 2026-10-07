import { save } from '../db.js';
import { formatDate, localDate } from '../lib/dates.js';
import { textBlocks } from '../lib/text.js';
import { backLink, button, element, icon, screenHeader, segmented } from '../ui/elements.js';
import { openSaveError } from '../ui/sheet.js';
import { openQuestionSheet } from './question-sheet.js';

const statuses = [[false, 'Nie wiem'], [true, 'Umiem']];
const NOTES_DELAY = 1000;
// Everything the screen shows except the notes, which the text field itself holds.
const shownFields = ['categoryId', 'question', 'answer', 'sourceTitle', 'sourceUrl', 'known'];

// The question on the screen, with every note saved here written in before the save starts,
// so a status or form save made right after never brings back older notes.
let shown;
let notesTimer;
let flushNotes = () => {};

// The field does not get a blur event when the address changes or the page is hidden or closed.
window.addEventListener('hashchange', () => flushNotes());
window.addEventListener('pagehide', () => flushNotes());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    flushNotes();
  }
});

export function renderQuestion(data, entered, id) {
  const question = data.questions.find((record) => record.id === id && !record.deleted);
  if (!question) {
    location.replace('#/wiedza');
    return document.createDocumentFragment();
  }
  // A redraw would take the cursor out of the notes, and a button pressed just as the field
  // lost focus would be replaced before the mouse button is released.
  const sameQuestion = question.id === shown?.id;
  if (!entered && sameQuestion && shownFields.every((field) => question[field] === shown[field])) {
    return null;
  }
  shown = question;
  const category = data.categories.find((record) => record.id === question.categoryId);
  const header = screenHeader(question.question, { eyebrow: category?.title });
  header.classList.add('question-header');
  const edit = button(null, 'icon-button', () => {
    flushNotes();
    openQuestionSheet(data, { question: shown });
  });
  edit.append(icon('edit'));
  edit.setAttribute('aria-label', 'Edytuj pytanie');
  edit.dataset.id = 'edit-question';
  const top = element('div', 'screen-top');
  top.append(backLink('#/wiedza', 'Baza wiedzy'), edit);
  const screen = document.createDocumentFragment();
  screen.append(
    top,
    header,
    statusSwitch(question),
    answerCard(question.answer),
    notesCard(question),
  );
  if (question.sourceUrl.startsWith('https://')) {
    screen.append(sourceCard(question));
  }
  return screen;
}

function statusSwitch(question) {
  const options = segmented('known', statuses, question.known);
  options.classList.add('segmented-accent');
  options.setAttribute('aria-label', 'Status');
  options.addEventListener('change', (event) => {
    const known = event.target.value === 'true';
    const knownAt = known ? new Date().toISOString() : null;
    save('questions', { ...shown, known, knownAt }).catch(() => {
      options.querySelector(`[value="${!known}"]`).checked = true;
      openSaveError();
    });
  });
  return options;
}

function notesCard(question) {
  const field = Object.assign(element('textarea', 'input'), { rows: 4, value: question.notes });
  field.dataset.id = 'notes';
  const label = element('label', 'field');
  label.append(element('span', 'card-title', 'Moje notatki'), field);
  const changed = element('p', 'notes-changed');
  showChanged(changed, question);
  const saveNotes = () => {
    clearTimeout(notesTimer);
    // An old field may still lose focus after another question took over the screen.
    if (shown.id !== question.id || field.value === shown.notes) {
      return;
    }
    shown = { ...shown, notes: field.value, notesAt: new Date().toISOString() };
    const saved = shown;
    save('questions', saved).then(() => showChanged(changed, saved));
  };
  flushNotes = saveNotes;
  field.addEventListener('input', () => {
    clearTimeout(notesTimer);
    notesTimer = setTimeout(saveNotes, NOTES_DELAY);
  });
  field.addEventListener('blur', saveNotes);
  const card = element('section', 'card');
  card.append(label, changed);
  return card;
}

function showChanged(node, question) {
  node.hidden = question.notes.trim() === '';
  if (!node.hidden) {
    const day = localDate(new Date(question.notesAt));
    node.textContent = `Zmienione ${formatDate(day, localDate(new Date()))}`;
  }
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
