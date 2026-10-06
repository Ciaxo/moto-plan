import { nouns, plural } from '../lib/format.js';
import { element, screenHeader, backLink, icon } from '../ui/elements.js';
import { getTheme, setTheme } from '../theme.js';

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
    themeCard(),
    privacyCard(),
    footer(data),
  );
  return screen;
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
