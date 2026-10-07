import { getOne, save } from './db.js';

const KEY = 'moto-plan-theme';
const darkScheme = matchMedia('(prefers-color-scheme: dark)');
const themeColor = document.querySelector('meta[name="theme-color"]');
let current = 'system';

export async function setTheme(theme) {
  const previous = current;
  current = theme;
  applyTheme();
  try {
    await save('settings', { id: 'theme', value: theme });
  } catch (error) {
    current = previous;
    applyTheme();
    throw error;
  }
  localStorage.setItem(KEY, theme);
}

export function forgetTheme() {
  localStorage.removeItem(KEY);
}

export async function startTheme() {
  await loadTheme();
  darkScheme.addEventListener('change', applyTheme);
}

export async function loadTheme() {
  const record = await getOne('settings', 'theme');
  current = record?.value ?? 'system';
  if (record) {
    localStorage.setItem(KEY, current);
  } else {
    localStorage.removeItem(KEY);
  }
  applyTheme();
}

function applyTheme() {
  const dark = current === 'dark' || (current === 'system' && darkScheme.matches);
  const root = document.documentElement;
  root.dataset.theme = dark ? 'dark' : 'light';
  themeColor.content = getComputedStyle(root).getPropertyValue('--bg').trim();
}
