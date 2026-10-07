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
  const error = errorLine('Nie udało się zapisać. Spróbuj jeszcze raz.');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (await tryAction(submit, error, save)) {
      closeSheet();
    }
  });
}

// Replacing all data shows its own errors, so only deleting ever reaches the message here.
export function openConfirm(heading, text, label, onConfirm) {
  const error = errorLine('Nie udało się usunąć. Spróbuj jeszcze raz.');
  const confirm = button(label, 'button button-primary', () => tryAction(confirm, error, onConfirm));
  const cancel = button('Anuluj', 'button', closeSheet);
  const body = document.createDocumentFragment();
  body.append(element('p', null, text), confirm, cancel);
  openSheet(heading, body);
  cancel.focus();
}

async function tryAction(trigger, error, action) {
  // Disabling the button takes the focus away from it, to the page behind the sheet.
  const hadFocus = document.activeElement === trigger;
  trigger.disabled = true;
  error.remove();
  try {
    await action();
    return true;
  } catch {
    // The sheet stays open with everything in it, so the action can simply be tried again.
    trigger.before(error);
    trigger.disabled = false;
    if (hadFocus) {
      trigger.focus();
    }
    return false;
  }
}

function errorLine(text) {
  const line = element('p', 'form-error', text);
  line.setAttribute('role', 'alert');
  return line;
}

// For changes saved straight away, without a sheet of their own to show the error in.
export function openSaveError(text = 'Zmiana nie została zapisana. Spróbuj jeszcze raz.') {
  openErrors('Nie udało się zapisać', [text]);
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
