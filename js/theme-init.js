{
  const theme = localStorage.getItem('moto-plan-theme') ?? 'system';
  const systemDark = matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = theme === 'dark' || (theme === 'system' && systemDark);
  const root = document.documentElement;
  root.dataset.theme = dark ? 'dark' : 'light';
  // index.html loads this script after the stylesheets, so the tokens are already known here.
  const standalone = matchMedia('(display-mode: standalone)').matches;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const token = standalone ? '--status-bar' : '--bg';
  themeColor.content = getComputedStyle(root).getPropertyValue(token).trim();
}
