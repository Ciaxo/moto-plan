import { remove, saveAll } from '../db.js';
import { nextOrder, ordered } from '../lib/order.js';
import { editRecord } from '../lib/pack.js';
import { button, element, field, select } from '../ui/elements.js';
import { closeSheet, openConfirm, openSheet } from '../ui/sheet.js';

const answerHint = 'Pusta linia zaczyna nowy akapit, a linia od „- " punkt listy.';
// No record has an empty id, so this option cannot be mistaken for a category.
const NEW_CATEGORY = '';
const emptyQuestion = { question: '', answer: '', sourceTitle: '', sourceUrl: '' };
const ownRecord = { origin: 'user', packId: null, userModified: false };
const newQuestion = { ...ownRecord, known: false, knownAt: null, notes: '', notesAt: null };

export function openQuestionSheet(data, { question, categoryId }) {
  const categories = ordered(data.categories);
  const values = question ?? {
    ...emptyQuestion,
    categoryId: categoryId || categories[0]?.id || NEW_CATEGORY,
  };
  const category = select(
    'category',
    [...categories.map((record) => [record.id, record.title]), [NEW_CATEGORY, 'Nowa kategoria…']],
    values.categoryId,
  );
  const categoryField = field('Kategoria', category);
  const categoryName = field('Nazwa kategorii', Object.assign(element('input', 'input'), {
    name: 'categoryTitle',
    required: true,
    pattern: '.*\\S.*',
  }));
  // Out of the form while hidden, so its required attribute does not block saving.
  const showCategoryName = () => {
    if (form.elements.category.value === NEW_CATEGORY) {
      categoryField.after(categoryName);
    } else {
      categoryName.remove();
    }
  };
  category.addEventListener('change', showCategoryName);
  const text = Object.assign(element('input', 'input'), {
    name: 'question',
    required: true,
    pattern: '.*\\S.*',
    value: values.question,
    autofocus: !question,
  });
  const answer = Object.assign(element('textarea', 'input'), {
    name: 'answer',
    rows: 5,
    value: values.answer,
  });
  const answerField = field('Odpowiedź', answer);
  answerField.append(element('span', 'field-hint', answerHint));
  const sourceTitle = Object.assign(element('input', 'input'), {
    name: 'sourceTitle',
    value: values.sourceTitle,
  });
  // Not type="url": the browser would refuse an address without https://, which may be saved.
  const sourceUrl = Object.assign(element('input', 'input'), {
    name: 'sourceUrl',
    inputMode: 'url',
    value: values.sourceUrl,
  });
  const submit = element('button', 'button button-primary', 'Zapisz pytanie');
  submit.type = 'submit';
  const form = element('form', 'form');
  form.append(
    categoryField,
    field('Pytanie', text),
    answerField,
    field('Tytuł źródła', sourceTitle),
    field('Adres źródła', sourceUrl),
    submit,
    button('Anuluj', 'button', closeSheet),
  );
  if (question) {
    form.append(button('Usuń pytanie', 'button button-secondary', () => confirmRemove(question)));
  }
  showCategoryName();
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    await saveQuestion(data, question, formValues(form.elements));
    closeSheet();
  });
  openSheet(question ? 'Edytuj pytanie' : 'Nowe pytanie', form);
}

// The question screen then finds no question and goes back to the list (location.replace).
function confirmRemove(question) {
  const text = `Pytanie „${question.question}" zniknie z bazy wiedzy.`;
  openConfirm('Usunąć pytanie?', text, 'Usuń pytanie', async () => {
    await remove('questions', question.id);
    closeSheet();
  });
}

function formValues(fields) {
  return {
    categoryId: fields.category.value,
    categoryTitle: fields.categoryTitle?.value,
    question: fields.question.value,
    answer: fields.answer.value,
    sourceTitle: fields.sourceTitle.value,
    sourceUrl: fields.sourceUrl.value,
  };
}

async function saveQuestion(data, question, { categoryTitle, ...changes }) {
  const changed = [];
  if (changes.categoryId === NEW_CATEGORY) {
    const order = nextOrder(ordered(data.categories));
    const category = { ...ownRecord, id: crypto.randomUUID(), order, title: categoryTitle };
    changed.push({ store: 'categories', record: category });
    changes.categoryId = category.id;
  }
  const { categoryId } = changes;
  const inCategory = ordered(data.questions).filter((record) => record.categoryId === categoryId);
  const order = categoryId === question?.categoryId ? question.order : nextOrder(inCategory);
  const record = question
    ? editRecord('questions', question, { ...changes, order })
    : { ...newQuestion, ...changes, order, id: crypto.randomUUID() };
  if (record) {
    changed.push({ store: 'questions', record });
  }
  // One transaction: a new category is never saved without its question.
  if (changed.length > 0) {
    await saveAll(changed);
  }
}
