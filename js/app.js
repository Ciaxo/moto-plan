import { loadAll, openDatabase } from './db.js';
import { startRouter } from './router.js';
import { startTheme } from './theme.js';
import { element } from './ui/elements.js';
import { renderStart } from './views/start.js';
import { renderPlan } from './views/plan.js';
import { renderKnowledge } from './views/knowledge.js';
import { renderQuestion } from './views/question.js';
import { renderBudget } from './views/budget.js';
import { renderMotorcycle } from './views/motorcycle.js';
import { renderData } from './views/data.js';

const screens = {
  start: renderStart,
  plan: renderPlan,
  wiedza: renderKnowledge,
  budzet: renderBudget,
  motocykl: renderMotorcycle,
  dane: renderData,
};

const databaseError = 'Nie da się otworzyć bazy danych. Przeglądarka nie pozwala tej stronie '
  + 'zapisywać danych na urządzeniu. Zezwól na to w ustawieniach witryny i odśwież stronę.';

const main = document.querySelector('main');
const tabs = document.querySelectorAll('nav a');
let data;
let current;

function markTab(name) {
  for (const tab of tabs) {
    if (tab.hash === `#/${name}`) {
      tab.setAttribute('aria-current', 'page');
    } else {
      tab.removeAttribute('aria-current');
    }
  }
}

function show(entered) {
  const { name, id } = current;
  const screen = id === undefined
    ? screens[name](data, entered)
    : renderQuestion(data, entered, id);
  // null means the screen is up to date, as on the question screen after its notes were saved.
  if (screen) {
    main.replaceChildren(screen);
  }
  markTab(name);
}

function focusById(id) {
  const node = main.querySelector(`[data-id="${CSS.escape(id)}"]`);
  node?.focus();
  return Boolean(node);
}

function enter(name, id) {
  const from = current;
  current = { name, id };
  show(true);
  // Back from a question, the list returns to that question instead of its top.
  const back = from?.id !== undefined && id === undefined && name === 'wiedza';
  if (!back || !focusById(`question-${from.id}`)) {
    scrollTo(0, 0);
  }
}

async function redraw() {
  data = await loadAll();
  const active = main.contains(document.activeElement) ? document.activeElement : null;
  const focusedId = active?.closest('[data-id]')?.dataset.id;
  show(false);
  if (focusedId) {
    focusById(focusedId);
  }
}

async function start() {
  try {
    await openDatabase();
  } catch {
    main.replaceChildren(element('p', 'card', databaseError));
    return;
  }
  await startTheme();
  data = await loadAll();
  // The browser would restore the scroll position itself, while the old screen is still shown.
  history.scrollRestoration = 'manual';
  window.addEventListener('datachange', redraw);
  startRouter(Object.keys(screens), enter);
}

start();
