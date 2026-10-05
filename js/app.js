import { startRouter } from './router.js';
import { startTheme } from './theme.js';
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

startTheme();
startRouter(Object.keys(screens), (name) => {
  main.replaceChildren(screens[name]());
  markTab(name);
});
