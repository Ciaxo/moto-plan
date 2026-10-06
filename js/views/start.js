import { importFile } from '../backup.js';
import { loadExample } from '../content.js';
import { needsBackup } from '../lib/backup.js';
import { formatMonth, localDate } from '../lib/dates.js';
import { currentStage, planStages } from '../lib/plan.js';
import { button, dot, element, screenHeader, icon } from '../ui/elements.js';

export function renderStart(data) {
  const today = localDate(new Date());
  const plan = planStages(data.stages, data.steps);
  const screen = document.createDocumentFragment();
  screen.append(header(plan, today, settingsLink(needsBackup(data, today))));
  if (isEmpty(data)) {
    screen.append(welcomeCard());
  }
  return screen;
}

function header(plan, today, action) {
  const month = formatMonth(today.slice(0, 7));
  const current = currentStage(plan);
  if (!current) {
    return screenHeader('Moto Plan', { eyebrow: month, action });
  }
  const eyebrow = `Etap ${plan.indexOf(current) + 1} z ${plan.length} · ${month}`;
  return screenHeader(current.stage.headline || current.stage.title, { eyebrow, action });
}

function settingsLink(warn) {
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
  return settings;
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
    button('Wczytaj paczkę z pliku', 'button button-primary', importFile),
    button('Zobacz przykład', 'button button-secondary', loadExample),
    scratch,
  );
  return card;
}
