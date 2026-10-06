import { loadExample } from '../content.js';
import { button, element, screenHeader, icon } from '../ui/elements.js';

export function renderStart(data) {
  const settings = element('a', 'icon-button');
  settings.href = '#/dane';
  settings.setAttribute('aria-label', 'Dane i ustawienia');
  settings.append(icon('settings'));
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
