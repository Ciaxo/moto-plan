import { save } from '../db.js';
import { button, element, field } from '../ui/elements.js';
import { closeSheet, openSheet } from '../ui/sheet.js';

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
