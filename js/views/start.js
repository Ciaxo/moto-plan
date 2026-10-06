import { loadExample } from '../content.js';
import { needsBackup } from '../lib/backup.js';
import { localDate } from '../lib/dates.js';
import { button, dot, element, screenHeader, icon } from '../ui/elements.js';

export function renderStart(data) {
  const warn = needsBackup(data, localDate(new Date()));
  const settings = element('a', 'icon-button');
  settings.href = '#/dane';
  settings.setAttribute(
    'aria-label',
    warn ? 'Dane i ustawienia, brak aktualnej kopii' : 'Dane i ustawienia',
  );
  settings.append(icon('settings'));
  if (warn) {
    settings.append(dot());
  }
  const screen = document.createDocumentFragment();
  screen.append(screenHeader('Start', { action: settings }));
  if (isEmpty(data)) {
    screen.append(welcomeCard());
  }
  return screen;
}

function isEmpty(data) {
  return ['stages', 'questions', 'costs']
    .every((store) => data[store].every((record) => record.deleted));
}

function welcomeCard() {
  const scratch = element('a', 'button', 'Zacznij od zera');
  scratch.href = '#/plan';
  const card = element('section', 'card');
  card.append(
    element('h2', 'card-title', 'Zacznij od treści'),
    element('p', null, 'Aplikacja jest pusta. Plan, pytania i koszty wczytasz z paczki treści '
      + 'albo dodasz sam.'),
    button('Zobacz przykład', 'button button-secondary', loadExample),
    scratch,
  );
  return card;
}
