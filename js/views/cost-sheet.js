import { remove, saveAll } from '../db.js';
import { nextOrder, ordered } from '../lib/order.js';
import { editRecord } from '../lib/pack.js';
import { button, dueField, element, field, segmented, select } from '../ui/elements.js';
import { closeSheet, openConfirm, openSheet } from '../ui/sheet.js';

const groups = [['once', 'Jednorazowy'], ['yearly', 'Roczny'], ['hidden', 'Ukryty']];
const statuses = [['planned', 'Planowane'], ['paid', 'Zapłacone']];
const ownRecord = { origin: 'user', packId: null, userModified: false };
const emptyCost = { title: '', amount: '', group: 'once', date: '', status: 'planned', note: '' };

export function openCostSheet(data, cost) {
  const goals = ordered(data.goals);
  const values = cost ?? { ...emptyCost, goalId: goals[0]?.id };
  const title = Object.assign(element('input', 'input'), {
    name: 'title',
    required: true,
    pattern: '.*\\S.*',
    placeholder: 'np. Kask',
    value: values.title,
    autofocus: !cost,
  });
  const amount = Object.assign(element('input', 'input'), {
    type: 'number',
    name: 'amount',
    required: true,
    min: '1',
    step: '1',
    inputMode: 'numeric',
    placeholder: 'np. 1500',
    value: values.amount,
  });
  const note = Object.assign(element('textarea', 'input'), {
    name: 'note',
    rows: 3,
    value: values.note,
  });
  const submit = element('button', 'button button-primary', 'Zapisz koszt');
  submit.type = 'submit';
  const form = element('form', 'form');
  form.append(
    field('Tytuł', title),
    field('Kwota (zł)', amount),
    choice('Rodzaj', 'group', groups, values.group),
  );
  // With one goal or none there is nothing to choose: the cost goes to that goal or a new one.
  if (goals.length > 1) {
    const options = goals.map((goal) => [goal.id, goal.title]);
    form.append(field('Cel', select('goal', options, values.goalId)));
  }
  form.append(
    dueField(values.date),
    choice('Status', 'status', statuses, values.status),
    field('Notatka', note),
    submit,
    button('Anuluj', 'button', closeSheet),
  );
  if (cost) {
    form.append(button('Usuń koszt', 'button button-secondary', () => confirmRemove(cost)));
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    await saveCost(data, cost, formValues(form.elements));
    closeSheet();
  });
  openSheet(cost ? 'Edytuj koszt' : 'Nowy koszt', form);
}

function choice(label, name, options, value) {
  const group = element('fieldset', 'field');
  group.append(element('legend', 'field-label', label), segmented(name, options, value));
  return group;
}

function confirmRemove(cost) {
  const text = `Koszt „${cost.title}" zniknie z budżetu.`;
  openConfirm('Usunąć koszt?', text, 'Usuń koszt', async () => {
    await remove('costs', cost.id);
    closeSheet();
    // The row is gone after the redraw, so focus moves to a button that stays on the screen.
    document.querySelector('[data-id="add-cost"]').focus();
  });
}

function formValues(fields) {
  return {
    title: fields.title.value,
    amount: Number(fields.amount.value),
    group: fields.group.value,
    goalId: fields.goal?.value,
    date: fields.due?.value ?? '',
    status: fields.status.value,
    note: fields.note.value,
  };
}

async function saveCost(data, cost, changes) {
  const goals = ordered(data.goals);
  const changed = [];
  let goalId = changes.goalId ?? cost?.goalId ?? goals[0]?.id;
  if (!goalId) {
    const order = nextOrder(goals);
    const goal = { ...ownRecord, id: crypto.randomUUID(), order, title: 'Mój cel' };
    changed.push({ store: 'goals', record: goal });
    goalId = goal.id;
  }
  const fields = { ...changes, goalId, paidAt: paidAt(cost, changes.status) };
  const record = cost
    ? editRecord('costs', cost, fields)
    : { ...ownRecord, ...fields, order: nextOrder(ordered(data.costs)), id: crypto.randomUUID() };
  if (record) {
    changed.push({ store: 'costs', record });
  }
  // One transaction: a new goal is never saved without its cost.
  if (changed.length > 0) {
    await saveAll(changed);
  }
}

function paidAt(cost, status) {
  if (status === cost?.status) {
    return cost.paidAt;
  }
  return status === 'paid' ? new Date().toISOString() : null;
}
