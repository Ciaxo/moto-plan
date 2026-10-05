import { getOne, save } from './db.js';

const KEY = 'moto-plan-theme';
const darkScheme = matchMedia('(prefers-color-scheme: dark)');
const themeColor = document.querySelector('meta[name="theme-color"]');
let current = 'system';

export function getTheme() {
  return current;
}

export async function setTheme(theme) {
  current = theme;
  applyTheme();
  await save('settings', { id: 'theme', value: theme });
  localStorage.setItem(KEY, theme);
}

export async function startTheme() {
  const record = await getOne('settings', 'theme');
  if (record) {
    current = record.value;
    localStorage.setItem(KEY, current);
  } else {
    localStorage.removeItem(KEY);
  }
  darkScheme.addEventListener('change', applyTheme);
  applyTheme();
}

function applyTheme() {
  const dark = current === 'dark' || (current === 'system' && darkScheme.matches);
  const root = document.documentElement;
  root.dataset.theme = dark ? 'dark' : 'light';
  themeColor.content = getComputedStyle(root).getPropertyValue('--bg').trim();
}
