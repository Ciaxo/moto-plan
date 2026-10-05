import { element, screenHeader, icon } from '../ui/elements.js';

export function renderStart() {
  const settings = element('a', 'icon-button');
  settings.href = '#/dane';
  settings.setAttribute('aria-label', 'Dane i ustawienia');
  settings.append(icon('settings'));
  return screenHeader('Start', { action: settings });
}
