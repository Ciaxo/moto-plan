// Only the knowledge base has pages below it: #/wiedza/<question id>.
const withId = ['wiedza'];

export function startRouter(names, show) {
  function handle() {
    const [name, ...rest] = location.hash.slice(2).split('/');
    const id = rest.length > 0 ? decode(rest.join('/')) : undefined;
    if (!names.includes(name) || (id !== undefined && !withId.includes(name))) {
      location.replace('#/start');
      return;
    }
    show(name, id);
  }

  window.addEventListener('hashchange', handle);
  handle();
}

// A broken escape such as %zz cannot be decoded. No record has an empty id, so the screen
// treats it like any missing question.
function decode(text) {
  try {
    return decodeURIComponent(text);
  } catch {
    return '';
  }
}
