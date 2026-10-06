import { save } from '../db.js';
import { budgetSettings, budgetTotals, depositsByDate, forecast } from '../lib/budget.js';
import { formatDate, formatMonth, localDate } from '../lib/dates.js';
import { formatAmount, plural } from '../lib/format.js';
import { ordered } from '../lib/order.js';
import { addButton, button, checkbox, element, icon, screenHeader } from '../ui/elements.js';
import { openCostSheet } from './cost-sheet.js';
import { openDepositSheet, openMonthlySheet } from './deposit-sheet.js';

const groups = [
  ['once', 'Jednorazowe'],
  ['yearly', 'Roczne'],
  ['hidden', 'Ukryte i rezerwa'],
];
const depositForms = ['wpłata', 'wpłaty', 'wpłat'];
const expanded = new Set();

export function renderBudget(data, entered) {
  if (entered) {
    expanded.clear();
    expanded.add('costs-once');
  }
  const today = localDate(new Date());
  const { monthlyDeposit } = budgetSettings(data.settings);
  const totals = budgetTotals(data.costs, data.deposits);
  const costs = ordered(data.costs);
  const deposits = depositsByDate(data.deposits);
  const context = { data, today };
  const addDeposit = () => openDepositSheet();
  const eyebrow = forecastText(forecast(totals, monthlyDeposit, today));
  const screen = document.createDocumentFragment();
  screen.append(screenHeader('Budżet', { eyebrow }));
  if (deposits.length === 0) {
    screen.append(starterCard(addDeposit));
  }
  screen.append(summaryCard(totals), monthlyCard(monthlyDeposit));
  if (deposits.length > 0) {
    screen.append(
      depositGroup(deposits, today),
      addButton('Dodaj wpłatę', 'add-deposit', addDeposit),
    );
  }
  screen.append(
    ...costGroups(costs, context),
    addButton('Dodaj koszt', 'add-cost', () => openCostSheet(data)),
  );
  return screen;
}

function forecastText(result) {
  return result.message ?? `Zakup około: ${formatMonth(result.month)}`;
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

function summaryCard(totals) {
  const collected = element('p', 'budget-collected');
  collected.append(
    element('span', 'budget-amount', formatAmount(totals.collected)),
    `z ${formatAmount(totals.total)}`,
  );
  const bar = element('progress', 'progress');
  // A max of 0 is ignored, so without costs the bar stays empty.
  bar.max = totals.total;
  bar.value = totals.collected;
  bar.setAttribute('aria-label', 'Zebrane');
  const card = element('section', 'card');
  card.append(
    element('p', 'budget-label', 'Zebrane'),
    collected,
    bar,
    figures([
      ['Na koncie', totals.onAccount],
      ['Wydane', totals.spent],
      ['Brakuje', totals.missing],
    ]),
  );
  return card;
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
  for (const [label, amount] of entries) {
    const item = element('div', 'figure');
    item.append(element('dt', null, label), element('dd', null, formatAmount(amount)));
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

function depositGroup(deposits, today) {
  const last = formatDate(deposits[0].date, today);
  const heading = element('span', 'group-heading');
  heading.append(
    element('span', 'group-title', 'Wpłaty'),
    element('span', 'row-meta', `${plural(deposits.length, depositForms)} · ostatnia ${last}`),
  );
  const list = element('ul', 'list');
  list.append(...deposits.map((deposit) => depositRow(deposit, today)));
  list.addEventListener('click', (event) => editDeposit(deposits, event.target));
  return foldCard('deposits', [heading], list);
}

function depositRow(deposit, today) {
  const main = element('button', 'row-main deposit-main');
  main.type = 'button';
  main.value = deposit.id;
  main.dataset.id = `deposit-${deposit.id}`;
  main.append(
    element('span', 'row-title', formatDate(deposit.date, today)),
    element('span', 'deposit-amount', formatAmount(deposit.amount)),
  );
  const row = element('li', 'row');
  row.append(main);
  return row;
}

function editDeposit(deposits, target) {
  const row = target.closest('.row-main');
  if (row) {
    openDepositSheet(deposits.find((deposit) => deposit.id === row.value));
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
  save('costs', { ...cost, status, paidAt: paid ? new Date().toISOString() : null });
}
