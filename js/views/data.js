import { screenHeader, backLink } from '../ui/elements.js';

export function renderData() {
  const screen = document.createDocumentFragment();
  screen.append(backLink('#/start', 'Start'), screenHeader('Dane i ustawienia'));
  return screen;
}
