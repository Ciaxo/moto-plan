const KEY = 'moto-plan-theme';
const darkScheme = matchMedia('(prefers-color-scheme: dark)');
const themeColor = document.querySelector('meta[name="theme-color"]');

export function getTheme() {
  return localStorage.getItem(KEY) ?? 'system';
}

export function setTheme(theme) {
  localStorage.setItem(KEY, theme);
  applyTheme();
}

export function startTheme() {
  darkScheme.addEventListener('change', applyTheme);
  applyTheme();
}

function applyTheme() {
  const theme = getTheme();
  const dark = theme === 'dark' || (theme === 'system' && darkScheme.matches);
  const root = document.documentElement;
  root.dataset.theme = dark ? 'dark' : 'light';
  themeColor.content = getComputedStyle(root).getPropertyValue('--bg').trim();
}
