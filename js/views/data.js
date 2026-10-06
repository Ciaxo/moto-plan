import { exportBackup } from '../backup.js';
import { backupAge, needsBackup } from '../lib/backup.js';
import { localDate } from '../lib/dates.js';
import { nouns, plural } from '../lib/format.js';
import { button, dot, element, screenHeader, backLink, icon } from '../ui/elements.js';
import { getTheme, setTheme } from '../theme.js';

const days = ['dzień', 'dni', 'dni'];

const themes = [
  ['light', 'Jasny'],
  ['dark', 'Ciemny'],
  ['system', 'Jak system'],
];

export function renderData(data) {
  const screen = document.createDocumentFragment();
  screen.append(
    backLink('#/start', 'Start'),
    screenHeader('Dane i ustawienia'),
    backupCard(data),
    themeCard(),
    privacyCard(),
    footer(data),
  );
  return screen;
}

function backupCard(data) {
  const today = localDate(new Date());
  const status = element('p', 'backup-status');
  if (needsBackup(data, today)) {
    status.append(dot());
  }
  status.append(backupStatus(backupAge(data, today)));
  const exportButton = button('Eksportuj do pliku', 'button button-primary', exportBackup);
  exportButton.prepend(icon('download'));
  exportButton.dataset.id = 'export';
  const card = element('section', 'card');
  card.append(element('h2', 'card-title', 'Kopia zapasowa'), status, exportButton);
  return card;
}

function backupStatus(age) {
  if (age === null) {
    return 'Nie masz jeszcze kopii';
  }
  if (age <= 0) {
    return 'Ostatnia kopia dzisiaj';
  }
  if (age === 1) {
    return 'Ostatnia kopia wczoraj';
  }
  return `Ostatnia kopia ${plural(age, days)} temu`;
}

function themeCard() {
  const card = element('section', 'card');
  const options = element('fieldset', 'segmented');
  options.setAttribute('aria-label', 'Wygląd');
  const current = getTheme();
  for (const [value, label] of themes) {
    const input = element('input');
    input.type = 'radio';
    input.name = 'theme';
    input.value = value;
    input.checked = value === current;
    input.dataset.id = `theme-${value}`;
    const option = element('label', 'segment');
    option.append(input, label);
    options.append(option);
  }
  options.addEventListener('change', (event) => setTheme(event.target.value));
  card.append(element('h2', 'card-title', 'Wygląd'), options);
  return card;
}

function privacyCard() {
  const text = element('div');
  text.append(
    element('h2', 'privacy-title', 'Aplikacja nie wysyła żadnych danych'),
    element('p', 'privacy-text', 'Wszystko jest zapisane tylko na tym urządzeniu. '
      + 'Bez konta, bez chmury, bez statystyk.'),
  );
  const card = element('section', 'card privacy');
  card.append(icon('shield'), text);
  return card;
}

function footer(data) {
  const counts = ['steps', 'questions', 'costs'].map((store) => {
    const count = data[store].filter((record) => !record.deleted).length;
    return plural(count, nouns[store]);
  });
  const text = [`Moto Plan ${self.APP_VERSION}`, ...counts].join(' · ');
  return element('footer', 'screen-footer', text);
}
