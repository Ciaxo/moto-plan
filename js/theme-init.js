{
  const theme = localStorage.getItem('moto-plan-theme') ?? 'system';
  const systemDark = matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = theme === 'dark' || (theme === 'system' && systemDark);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}
