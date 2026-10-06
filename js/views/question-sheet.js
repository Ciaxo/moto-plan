import { save } from '../db.js';
import { nextOrder, ordered } from '../lib/order.js';
import { editRecord } from '../lib/pack.js';
import { button, element, field, select } from '../ui/elements.js';
import { closeSheet, openSheet } from '../ui/sheet.js';

const answerHint = 'Pusta linia zaczyna nowy akapit, a linia od „- " punkt listy.';
const emptyQuestion = { question: '', answer: '', sourceTitle: '', sourceUrl: '' };
const newQuestion = {
  origin: 'user',
  packId: null,
  userModified: false,
  known: false,
  knownAt: null,
  notes: '',
  notesAt: null,
};

export function openQuestionSheet(data, { question, categoryId }) {
  const categories = ordered(data.categories);
  const values = question ?? { ...emptyQuestion, categoryId: categoryId || categories[0]?.id };
  const category = select(
    'category',
    categories.map((record) => [record.id, record.title]),
    values.categoryId,
  );
  category.querySelector('select').required = true;
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
    field('Kategoria', category),
    field('Pytanie', text),
    answerField,
    field('Tytuł źródła', sourceTitle),
    field('Adres źródła', sourceUrl),
    submit,
    button('Anuluj', 'button', closeSheet),
  );
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    await saveQuestion(data, question, formValues(form.elements));
    closeSheet();
  });
  openSheet(question ? 'Edytuj pytanie' : 'Nowe pytanie', form);
}

function formValues(fields) {
  return {
    categoryId: fields.category.value,
    question: fields.question.value,
    answer: fields.answer.value,
    sourceTitle: fields.sourceTitle.value,
    sourceUrl: fields.sourceUrl.value,
  };
}

async function saveQuestion(data, question, changes) {
  const { categoryId } = changes;
  const inCategory = ordered(data.questions).filter((record) => record.categoryId === categoryId);
  const order = categoryId === question?.categoryId ? question.order : nextOrder(inCategory);
  const record = question
    ? editRecord('questions', question, { ...changes, order })
    : { ...newQuestion, ...changes, order, id: crypto.randomUUID() };
  if (record) {
    await save('questions', record);
  }
}
