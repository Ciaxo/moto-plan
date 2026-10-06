import { remove, save } from '../db.js';
import { editRecord } from '../lib/pack.js';
import { nextOrder } from '../lib/order.js';
import { button, dueField, element, field, select } from '../ui/elements.js';
import { closeSheet, openConfirm, openSheet } from '../ui/sheet.js';

const emptyStep = { title: '', dueDate: '', cost: null, note: '' };
const newStep = {
  origin: 'user', packId: null, userModified: false, hint: '', done: false, doneAt: null,
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
  const stages = plan.map(({ stage }, index) => [stage.id, `${index + 1} · ${stage.title}`]);
  const submit = element('button', 'button button-primary', 'Zapisz krok');
  submit.type = 'submit';
  const form = element('form', 'form');
  form.append(
    field('Tytuł', title),
    field('Etap', select('stage', stages, values.stageId)),
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
