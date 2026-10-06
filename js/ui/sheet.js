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
