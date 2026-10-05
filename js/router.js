export function startRouter(names, show) {
  function handle() {
    const name = location.hash.slice(2);
    if (!names.includes(name)) {
      location.replace('#/start');
      return;
    }
    show(name);
  }

  window.addEventListener('hashchange', handle);
  handle();
}
