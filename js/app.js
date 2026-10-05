import { startRouter } from './router.js';
import { renderStart } from './views/start.js';
import { renderPlan } from './views/plan.js';
import { renderKnowledge } from './views/knowledge.js';
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

const main = document.querySelector('main');

startRouter(Object.keys(screens), (name) => {
  main.replaceChildren(screens[name]());
});
