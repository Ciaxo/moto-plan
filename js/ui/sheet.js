import { button, element } from './elements.js';

const sheet = document.querySelector('.sheet');
const title = sheet.querySelector('.sheet-title');
const content = sheet.querySelector('.sheet-content');

sheet.querySelector('.sheet-close').addEventListener('click', closeSheet);

export function openSheet(heading, body) {
  title.textContent = heading;
  content.replaceChildren(body);
  if (!sheet.open) {
    sheet.showModal();
  }
}

export function closeSheet() {
  sheet.close();
}

export function onSubmit(form, save) {
  const submit = form.querySelector('[type="submit"]');
  const error = element('p', 'form-error', 'Nie udało się zapisać. Spróbuj jeszcze raz.');
  error.setAttribute('role', 'alert');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    // Disabling the button takes the focus away from it, to the page behind the sheet.
    const hadFocus = document.activeElement === submit;
    submit.disabled = true;
    error.remove();
    try {
      await save();
    } catch {
      // The sheet stays open with everything typed in, so saving can simply be tried again.
      submit.before(error);
      submit.disabled = false;
      if (hadFocus) {
        submit.focus();
      }
      return;
    }
    closeSheet();
  });
}

export function openConfirm(heading, text, label, onConfirm) {
  const confirm = button(label, 'button button-primary', () => {
    confirm.disabled = true;
    onConfirm();
  });
  const cancel = button('Anuluj', 'button', closeSheet);
  const body = document.createDocumentFragment();
  body.append(element('p', null, text), confirm, cancel);
  openSheet(heading, body);
  cancel.focus();
}

export function openErrors(heading, errors) {
  const list = element('ul');
  for (const error of errors) {
    list.append(element('li', null, error));
  }
  const body = document.createDocumentFragment();
  body.append(list, button('Zamknij', 'button button-secondary', closeSheet));
  openSheet(heading, body);
}
