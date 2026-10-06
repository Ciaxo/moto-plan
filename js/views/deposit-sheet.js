import { remove, save } from '../db.js';
import { formatDate, localDate } from '../lib/dates.js';
import { formatAmount } from '../lib/format.js';
import { editRecord } from '../lib/pack.js';
import { button, element, field } from '../ui/elements.js';
import { closeSheet, openConfirm, openSheet } from '../ui/sheet.js';

const newDeposit = { origin: 'user', packId: null, userModified: false, goalId: null };

export function openDepositSheet(deposit) {
  const today = localDate(new Date());
  const values = deposit ?? { amount: '', date: today, note: '' };
  const amount = Object.assign(element('input', 'input'), {
    type: 'number',
    name: 'amount',
    required: true,
    min: '1',
    step: '1',
    inputMode: 'numeric',
    placeholder: 'np. 500',
    value: values.amount,
    autofocus: !deposit,
  });
  const date = Object.assign(element('input', 'input'), {
    type: 'date',
    name: 'date',
    required: true,
    value: values.date,
  });
  const note = Object.assign(element('textarea', 'input'), {
    name: 'note',
    rows: 3,
    value: values.note,
  });
  const submit = element('button', 'button button-primary', 'Zapisz wpłatę');
  submit.type = 'submit';
  const form = element('form', 'form');
  form.append(
    field('Kwota (zł)', amount),
    field('Data', date),
    field('Notatka', note),
    submit,
    button('Anuluj', 'button', closeSheet),
  );
  if (deposit) {
    form.append(button('Usuń wpłatę', 'button button-secondary', () => confirmRemove(deposit)));
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    await saveDeposit(deposit, formValues(form.elements));
    closeSheet();
  });
  openSheet(deposit ? 'Edytuj wpłatę' : 'Nowa wpłata', form);
}

function formValues(fields) {
  return { amount: Number(fields.amount.value), date: fields.date.value, note: fields.note.value };
}

async function saveDeposit(deposit, changes) {
  const record = deposit
    ? editRecord('deposits', deposit, changes)
    : { ...newDeposit, ...changes, id: crypto.randomUUID() };
  if (record) {
    await save('deposits', record);
  }
}

function confirmRemove(deposit) {
  const date = formatDate(deposit.date, localDate(new Date()));
  const text = `Wpłata ${formatAmount(deposit.amount)} z ${date} zniknie z budżetu.`;
  openConfirm('Usunąć wpłatę?', text, 'Usuń wpłatę', async () => {
    await remove('deposits', deposit.id);
    closeSheet();
    // The row may be gone after the redraw, so focus moves to a button that stays on the screen.
    document.querySelector('[data-id="add-deposit"]').focus();
  });
}

export function openMonthlySheet(monthlyDeposit) {
  // The only field of the sheet, so it gets the focus even though it edits a saved value.
  const amount = Object.assign(element('input', 'input'), {
    type: 'number',
    name: 'amount',
    required: true,
    min: '0',
    step: '1',
    inputMode: 'numeric',
    value: monthlyDeposit,
    autofocus: true,
  });
  const submit = element('button', 'button button-primary', 'Zapisz kwotę');
  submit.type = 'submit';
  const form = element('form', 'form');
  form.append(
    field('Kwota (zł)', amount),
    submit,
    button('Anuluj', 'button', closeSheet),
  );
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    const value = Number(amount.value);
    if (value !== monthlyDeposit) {
      await save('settings', { id: 'monthlyDeposit', value });
    }
    closeSheet();
  });
  openSheet('Wpłata co miesiąc', form);
}
