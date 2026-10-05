import { openDatabase } from './db.js';
import { startRouter } from './router.js';
import { startTheme } from './theme.js';
import { element } from './ui/elements.js';
import { renderStart } from './views/start.js';
import { renderPlan } from './views/plan.js';
import { renderKnowledge } from './views/knowledge.js';
import { renderBudget } from './views/budget.js';
import { renderMotorcycle } from './views/motorcycle.js';
import { renderData } from './views/data.js';
import { renderComponents } from './views/components.js';

const screens = {
  start: renderStart,
  plan: renderPlan,
  wiedza: renderKnowledge,
  budzet: renderBudget,
  motocykl: renderMotorcycle,
  dane: renderData,
  komponenty: renderComponents,
};

const databaseError = 'Nie da się otworzyć bazy danych. Przeglądarka nie pozwala tej stronie '
  + 'zapisywać danych na urządzeniu. Zezwól na to w ustawieniach witryny i odśwież stronę.';

const main = document.querySelector('main');
const tabs = document.querySelectorAll('nav a');

function markTab(name) {
  for (const tab of tabs) {
    if (tab.hash === `#/${name}`) {
      tab.setAttribute('aria-current', 'page');
    } else {
      tab.removeAttribute('aria-current');
    }
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
  startRouter(Object.keys(screens), (name) => {
    main.replaceChildren(screens[name]());
    markTab(name);
  });
}

start();
