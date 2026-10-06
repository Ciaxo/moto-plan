import { element, screenHeader, backLink } from '../ui/elements.js';
import { getTheme, setTheme } from '../theme.js';

const themes = [
  ['light', 'Jasny'],
  ['dark', 'Ciemny'],
  ['system', 'Jak system'],
];

export function renderData() {
  const screen = document.createDocumentFragment();
  screen.append(backLink('#/start', 'Start'), screenHeader('Dane i ustawienia'), themeCard());
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
