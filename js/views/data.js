import { screenHeader, backLink } from '../ui/elements.js';
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
  const card = document.createElement('section');
  card.className = 'card';
  const title = document.createElement('h2');
  title.className = 'card-title';
  title.textContent = 'Wygląd';
  const options = document.createElement('fieldset');
  options.className = 'segmented';
  options.setAttribute('aria-label', 'Wygląd');
  const current = getTheme();
  for (const [value, label] of themes) {
    const option = document.createElement('label');
    option.className = 'segment';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'theme';
    input.value = value;
    input.checked = value === current;
    option.append(input, label);
    options.append(option);
  }
  options.addEventListener('change', (event) => setTheme(event.target.value));
  card.append(title, options);
  return card;
}
