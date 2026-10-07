import { save } from '../db.js';
import {
  budgetSettings, budgetTotals, currentGoal, depositsByDate, forecast, goalFunding,
} from '../lib/budget.js';
import { formatDate, formatMonth, localDate } from '../lib/dates.js';
import { formatAmount, plural } from '../lib/format.js';
import { ordered } from '../lib/order.js';
import {
  addButton, button, checkbox, element, icon, percentBar, screenHeader, segmented,
} from '../ui/elements.js';
import { openSaveError } from '../ui/sheet.js';
import { openCostSheet } from './cost-sheet.js';
import { openDepositSheet, openMonthlySheet } from './deposit-sheet.js';

const groups = [
  ['once', 'Jednorazowe'],
  ['yearly', 'Roczne'],
  ['hidden', 'Ukryte i rezerwa'],
];
const modes = [['single', 'Jeden cel'], ['split', 'Osobne cele']];
const depositForms = ['wpłata', 'wpłaty', 'wpłat'];
const itemForms = ['pozycja', 'pozycje', 'pozycji'];
const noCostsText = 'Budżet porównuje koszty z pieniędzmi, które odkładasz. '
  + 'Dodaj pierwszy koszt.';
const expanded = new Set();
let lastGoalId;

export function renderBudget(data, entered) {
  const today = localDate(new Date());
  const { goalMode, monthlyDeposit } = budgetSettings(data.settings);
  const goals = ordered(data.goals);
  const split = goals.length > 1 && goalMode === 'split';
  const funding = goalFunding(data.goals, data.costs, data.deposits);
  expandCurrent(currentGoal(funding), entered);
  const totals = budgetTotals(data.costs, data.deposits);
  const purchase = forecast(totals, monthlyDeposit, today);
  const deposits = depositsByDate(data.deposits);
  // In the single goal mode no goal is shown anywhere, so deposits do not show theirs either.
  const context = { data, today, goals: split ? goals : [] };
  const costs = ordered(data.costs);
  const addDeposit = () => openDepositSheet(context.goals);
  const addCost = () => openCostSheet(data);
  const screen = document.createDocumentFragment();
  screen.append(screenHeader('Budżet', { eyebrow: forecastText(purchase) }));
  if (goals.length > 1) {
    screen.append(modeSwitch(goalMode));
  }
  if (deposits.length === 0) {
    screen.append(starterCard(addDeposit));
  }
  if (costs.length === 0) {
    screen.append(noCostsCard(addCost));
  } else if (split) {
    screen.append(...goalCards(funding, totals, purchase, context));
  } else {
    screen.append(summaryCard(totals));
  }
  screen.append(monthlyCard(monthlyDeposit));
  if (deposits.length > 0) {
    screen.append(
      depositGroup(deposits, context),
      addButton('Dodaj wpłatę', 'add-deposit', addDeposit),
    );
  }
  if (costs.length === 0) {
    return screen;
  }
  if (!split) {
    screen.append(...costGroups(costs, context));
  }
  screen.append(addButton('Dodaj koszt', 'add-cost', addCost));
  return screen;
}

function expandCurrent(current, entered) {
  if (entered) {
    expanded.clear();
    expanded.add('costs-once');
  }
  const id = current?.goal.id;
  if (id && (entered || id !== lastGoalId)) {
    expanded.add(`goal-${id}`);
  }
  lastGoalId = id;
}

function forecastText(purchase) {
  return purchase.message ?? `Zakup około: ${formatMonth(purchase.month)}`;
}

function modeSwitch(goalMode) {
  const options = segmented('goal-mode', modes, goalMode);
  options.setAttribute('aria-label', 'Tryb budżetu');
  options.addEventListener('change', (event) => {
    save('settings', { id: 'goalMode', value: event.target.value }).catch(() => {
      options.querySelector(`[value="${goalMode}"]`).checked = true;
      openSaveError();
    });
  });
  return options;
}

// Same data-id as "Dodaj wpłatę", which takes the focus when this card disappears.
function starterCard(addDeposit) {
  const card = element('section', 'card');
  card.append(
    element('p', null, 'Zacznij od tego, co już masz odłożone'),
    addButton('Dodaj pierwszą wpłatę', 'add-deposit', addDeposit),
  );
  return card;
}

// Same data-id as "Dodaj koszt" below the costs, which takes the focus when this card disappears.
function noCostsCard(addCost) {
  const card = element('section', 'card');
  card.append(
    element('p', null, noCostsText),
    addButton('Dodaj koszt', 'add-cost', addCost),
  );
  return card;
}

function summaryCard(totals) {
  const collected = element('p', 'budget-collected');
  collected.append(
    element('span', 'budget-amount', formatAmount(totals.collected)),
    `z ${formatAmount(totals.total)}`,
  );
  const card = element('section', 'card');
  card.append(
    element('p', 'budget-label', 'Zebrane'),
    collected,
    percentBar(totals.percent, 'Zebrane'),
    figures([
      ['Na koncie', formatAmount(totals.onAccount)],
      ['Wydane', formatAmount(totals.spent)],
      ['Brakuje', formatAmount(totals.missing)],
    ]),
  );
  return card;
}

function goalCards(funding, totals, purchase, context) {
  // A manual deposit above a goal's value stays with that goal, so goals alone can hide what the
  // whole budget is missing. The last card shows the whole budget.
  const overall = figures([
    ['Brakuje', formatAmount(totals.missing)],
    ['Zakup około', purchase.message ?? formatMonth(purchase.month)],
  ]);
  return funding.map((entry, index) => {
    const last = index === funding.length - 1;
    return goalCard(entry, index + 1, last ? overall : null, context);
  });
}

function goalCard(entry, number, overall, context) {
  const { goal, costs, value, funded, spent, percent, covered } = entry;
  const heading = element('div', 'goal-heading');
  heading.append(
    element('p', 'card-title', `Cel ${number}`),
    element('h2', 'goal-title', goal.title),
  );
  const head = element('div', 'goal-head');
  head.append(heading);
  // A goal without costs has nothing to cover.
  if (value > 0) {
    head.append(covered ? coveredBadge() : element('span', 'goal-percent', `${percent}%`));
  }
  const amount = element('p', 'budget-collected');
  const spentText = spent > 0 ? ` · wydane ${formatAmount(spent)}` : '';
  amount.append(
    element('span', 'goal-funded', formatAmount(funded)),
    `z ${formatAmount(value)}${spentText}`,
  );
  const card = element('section', 'card');
  card.append(head, amount, percentBar(percent, goal.title));
  if (overall) {
    card.append(overall);
  }
  if (costs.length > 0) {
    card.append(goalCosts(goal, costs, context));
  }
  return card;
}

function coveredBadge() {
  const badge = element('span', 'goal-badge', 'Pokryty');
  badge.prepend(icon('check'));
  return badge;
}

function goalCosts(goal, costs, context) {
  const heading = element('span', 'group-title', plural(costs.length, itemForms));
  const list = foldCard(`goal-${goal.id}`, [heading], costList(costs, context));
  list.classList.add('goal-costs');
  return list;
}

function monthlyCard(monthlyDeposit) {
  const node = button(null, 'card monthly', () => openMonthlySheet(monthlyDeposit));
  node.dataset.id = 'monthly';
  node.append(
    element('span', 'monthly-label', 'Wpłata co miesiąc'),
    element('span', 'monthly-value', monthlyDeposit > 0 ? formatAmount(monthlyDeposit) : 'Ustaw'),
    icon('chevron-right'),
  );
  return node;
}

function figures(entries) {
  const list = element('dl', 'figures');
  for (const [label, value] of entries) {
    const item = element('div', 'figure');
    item.append(element('dt', null, label), element('dd', null, value));
    list.append(item);
  }
  return list;
}

function foldCard(id, heading, body) {
  const card = element('details', 'card fold');
  card.open = expanded.has(id);
  card.addEventListener('toggle', () => {
    if (card.open) {
      expanded.add(id);
    } else {
      expanded.delete(id);
    }
  });
  const chevron = icon('chevron-down');
  chevron.classList.add('fold-chevron');
  const summary = element('summary', 'fold-summary');
  summary.dataset.id = id;
  summary.append(...heading, chevron);
  card.append(summary, body);
  return card;
}

function depositGroup(deposits, { goals, today }) {
  const titles = new Map(goals.map((goal) => [goal.id, goal.title]));
  const last = formatDate(deposits[0].date, today);
  const heading = element('span', 'group-heading');
  heading.append(
    element('span', 'group-title', 'Wpłaty'),
    element('span', 'row-meta', `${plural(deposits.length, depositForms)} · ostatnia ${last}`),
  );
  const list = element('ul', 'list');
  for (const deposit of deposits) {
    list.append(depositRow(deposit, titles.get(deposit.goalId), today));
  }
  list.addEventListener('click', (event) => editDeposit(deposits, goals, event.target));
  return foldCard('deposits', [heading], list);
}

function depositRow(deposit, goalTitle, today) {
  const main = element('button', 'row-main deposit-main');
  main.type = 'button';
  main.value = deposit.id;
  main.dataset.id = `deposit-${deposit.id}`;
  main.append(element('span', null, formatDate(deposit.date, today)));
  if (goalTitle) {
    main.append(element('span', 'row-meta', goalTitle));
  }
  main.append(element('span', 'deposit-amount', formatAmount(deposit.amount)));
  const row = element('li', 'row');
  row.append(main);
  return row;
}

function editDeposit(deposits, goals, target) {
  const row = target.closest('.row-main');
  if (row) {
    openDepositSheet(goals, deposits.find((deposit) => deposit.id === row.value));
  }
}

function costGroups(costs, context) {
  const cards = [];
  for (const [group, title] of groups) {
    const inGroup = costs.filter((cost) => cost.group === group);
    if (inGroup.length > 0) {
      cards.push(costGroup(`costs-${group}`, title, inGroup, context));
    }
  }
  return cards;
}

function costGroup(id, title, costs, context) {
  const total = costs.reduce((sum, cost) => sum + cost.amount, 0);
  const heading = [
    element('span', 'group-title', title),
    element('span', 'group-sum', formatAmount(total)),
  ];
  return foldCard(id, heading, costList(costs, context));
}

function costList(costs, { data, today }) {
  const list = element('ul', 'list');
  list.append(...costs.map((cost) => costRow(cost, today)));
  list.addEventListener('change', (event) => togglePaid(costs, event.target));
  list.addEventListener('click', (event) => editCost(data, costs, event.target));
  return list;
}

function editCost(data, costs, target) {
  const row = target.closest('.row-main');
  if (row) {
    openCostSheet(data, costs.find((cost) => cost.id === row.value));
  }
}

function costRow(cost, today) {
  const check = checkbox(cost.title, cost.id, cost.status === 'paid');
  check.querySelector('input').dataset.id = `paid-${cost.id}`;
  const main = element('button', 'row-main cost-main');
  main.type = 'button';
  main.value = cost.id;
  main.dataset.id = `cost-${cost.id}`;
  main.append(
    element('span', 'row-title', cost.title),
    element('span', 'row-meta', costMeta(cost, today)),
    element('span', 'cost-amount', formatAmount(cost.amount)),
  );
  const row = element('li', 'row');
  row.append(check, main);
  return row;
}

function costMeta(cost, today) {
  if (cost.status === 'paid') {
    return `zapłacone ${formatDate(localDate(new Date(cost.paidAt)), today)}`;
  }
  return cost.date ? `planowane · ${formatDate(cost.date, today)}` : 'planowane';
}

function togglePaid(costs, input) {
  const cost = costs.find((item) => item.id === input.value);
  const paid = input.checked;
  const status = paid ? 'paid' : 'planned';
  const paidAt = paid ? new Date().toISOString() : null;
  save('costs', { ...cost, status, paidAt }).catch(() => {
    input.checked = !paid;
    openSaveError();
  });
}
