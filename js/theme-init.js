{
  const theme = localStorage.getItem('moto-plan-theme') ?? 'system';
  const systemDark = matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = theme === 'dark' || (theme === 'system' && systemDark);
  const root = document.documentElement;
  root.dataset.theme = dark ? 'dark' : 'light';
  // index.html loads this script after the stylesheets, so --bg is already known here.
  const themeColor = document.querySelector('meta[name="theme-color"]');
  themeColor.content = getComputedStyle(root).getPropertyValue('--bg').trim();
}
