import { remove, save } from '../db.js';
import { editRecord } from '../lib/pack.js';
import { nextOrder } from '../lib/order.js';
import { button, element, field, icon } from '../ui/elements.js';
import { closeSheet, openConfirm, openSheet } from '../ui/sheet.js';

const emptyStep = { title: '', dueDate: '', cost: null, note: '' };
const newStep = {
  origin: 'user', packId: null, userModified: false, hint: '', done: false, doneAt: null,
};

const dueKinds = [['none', 'Brak'], ['year', 'Rok'], ['month', 'Miesiąc'], ['day', 'Dzień']];
const kindByLength = { 0: 'none', 4: 'year', 7: 'month', 10: 'day' };
// Desktop Firefox has no month picker and shows a plain text field, hence the pattern.
const dueInputs = {
  year: { type: 'text', inputMode: 'numeric', pattern: '\\d{4}', placeholder: 'RRRR' },
  month: { type: 'month', pattern: '\\d{4}-\\d{2}', placeholder: 'RRRR-MM' },
  day: { type: 'date' },
};

export function openStepSheet(plan, { step, stageId }) {
  const values = step ?? { ...emptyStep, stageId };
  const title = Object.assign(element('input', 'input'), {
    name: 'title',
    required: true,
    pattern: '.*\\S.*',
    placeholder: 'np. Badanie lekarskie',
    value: values.title,
    autofocus: !step,
  });
  const cost = Object.assign(element('input', 'input'), {
    type: 'number',
    name: 'cost',
    min: '1',
    step: '1',
    inputMode: 'numeric',
    placeholder: 'np. 59',
    value: values.cost ?? '',
  });
  const note = Object.assign(element('textarea', 'input'), {
    name: 'note',
    rows: 3,
    value: values.note,
  });
  const noteField = field('Notatka', note);
  if (values.hint) {
    note.before(element('span', 'field-hint', values.hint));
  }
  const submit = element('button', 'button button-primary', 'Zapisz krok');
  submit.type = 'submit';
  const form = element('form', 'form');
  form.append(
    field('Tytuł', title),
    field('Etap', stageSelect(plan, values.stageId)),
    dueField(values.dueDate),
    field('Koszt (zł)', cost),
    noteField,
    submit,
    button('Anuluj', 'button', closeSheet),
  );
  if (step) {
    form.append(button('Usuń krok', 'button button-secondary', () => confirmRemove(step)));
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    await saveStep(plan, step, formValues(form.elements));
    closeSheet();
  });
  openSheet(step ? 'Edytuj krok' : 'Nowy krok', form);
}

function confirmRemove(step) {
  openConfirm('Usunąć krok?', `Krok „${step.title}" zniknie z planu.`, 'Usuń krok', async () => {
    await remove('steps', step.id);
    closeSheet();
    // The row is gone after the redraw, so focus moves to a button that stays in the stage.
    const addStep = CSS.escape(`add-step-${step.stageId}`);
    document.querySelector(`[data-id="${addStep}"]`).focus();
  });
}

function stageSelect(plan, stageId) {
  const select = Object.assign(element('select', 'input'), { name: 'stage' });
  plan.forEach(({ stage }, index) => {
    const option = element('option', null, `${index + 1} · ${stage.title}`);
    option.value = stage.id;
    option.selected = stage.id === stageId;
    select.append(option);
  });
  const wrapper = element('span', 'select');
  wrapper.append(select, icon('chevron-down'));
  return wrapper;
}

function dueField(dueDate) {
  const savedKind = kindByLength[dueDate.length];
  const kinds = element('div', 'segmented');
  for (const [kind, label] of dueKinds) {
    const radio = Object.assign(element('input'), {
      type: 'radio',
      name: 'due-kind',
      value: kind,
      checked: kind === savedKind,
    });
    const option = element('label', 'segment');
    option.append(radio, label);
    kinds.append(option);
  }
  const group = element('fieldset', 'field');
  group.append(element('legend', 'field-label', 'Termin'), kinds);
  let input = dueInput(savedKind, dueDate);
  if (input) {
    group.append(input);
  }
  kinds.addEventListener('change', (event) => {
    input?.remove();
    const kind = event.target.value;
    input = dueInput(kind, kind === savedKind ? dueDate : '');
    if (input) {
      group.append(input);
    }
  });
  return group;
}

function dueInput(kind, value) {
  if (kind === 'none') {
    return null;
  }
  const input = Object.assign(element('input', 'input'), dueInputs[kind]);
  Object.assign(input, { name: 'due', required: true, value });
  input.setAttribute('aria-label', 'Termin');
  return input;
}

function formValues(fields) {
  return {
    stageId: fields.stage.value,
    title: fields.title.value,
    dueDate: fields.due?.value ?? '',
    cost: fields.cost.value === '' ? null : Number(fields.cost.value),
    note: fields.note.value,
  };
}

async function saveStep(plan, step, changes) {
  const target = plan.find((entry) => entry.stage.id === changes.stageId);
  const order = changes.stageId === step?.stageId ? step.order : nextOrder(target.steps);
  const record = step
    ? editRecord('steps', step, { ...changes, order })
    : { ...newStep, ...changes, order, id: crypto.randomUUID() };
  if (record) {
    await save('steps', record);
  }
}
