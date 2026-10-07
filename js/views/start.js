import { importFile } from '../backup.js';
import { loadExample } from '../content.js';
import { needsBackup } from '../lib/backup.js';
import { budgetSettings, budgetTotals, forecast } from '../lib/budget.js';
import { formatMonth, localDate } from '../lib/dates.js';
import { formatAmount, plural, pluralForm } from '../lib/format.js';
import {
  countDone, currentStage, isClosed, nextSteps, planStages, progress,
} from '../lib/plan.js';
import {
  button, dot, element, icon, percentBar, screenHeader, SVG_NS,
} from '../ui/elements.js';
import { clickedStep, stepRow, stepsGenitive, toggleStep } from './plan.js';
import { openStepSheet } from './step-sheet.js';

const stagesGenitive = ['etapu', 'etapów', 'etapów'];
const closedForms = ['zamknięty', 'zamknięte', 'zamkniętych'];
// The gauge is drawn in viewBox units, 208 wide like --gauge: a half circle around (104, 104).
const gaugeArc = 'M 6 104 A 98 98 0 0 1 202 104';

export function renderStart(data) {
  const today = localDate(new Date());
  const plan = planStages(data.stages, data.steps);
  const current = currentStage(plan);
  const screen = document.createDocumentFragment();
  screen.append(header(plan, current, today, settingsLink(needsBackup(data, today))));
  if (isEmpty(data)) {
    screen.append(welcomeCard());
    return screen;
  }
  const steps = plan.flatMap((entry) => entry.steps);
  if (plan.length > 0) {
    screen.append(progressCard(plan, steps, current));
  }
  screen.append(...nextStepsSection(plan, steps, today));
  const totals = budgetTotals(data.costs, data.deposits);
  if (totals.total > 0) {
    const { monthlyDeposit } = budgetSettings(data.settings);
    screen.append(savingsCard(totals, forecast(totals, monthlyDeposit, today)));
  }
  return screen;
}

function header(plan, current, today, action) {
  const month = formatMonth(today.slice(0, 7));
  if (!current) {
    return screenHeader('Moto Plan', { eyebrow: month, action });
  }
  const eyebrow = `Etap ${plan.indexOf(current) + 1} z ${plan.length} · ${month}`;
  return screenHeader(current.stage.headline || current.stage.title, { eyebrow, action });
}

function settingsLink(warn) {
  const settings = element('a', 'icon-button');
  settings.href = '#/dane';
  settings.setAttribute(
    'aria-label',
    warn ? 'Dane i ustawienia, brak aktualnej kopii' : 'Dane i ustawienia',
  );
  settings.append(icon('settings'));
  if (warn) {
    settings.append(dot());
  }
  return settings;
}

function progressCard(plan, steps, current) {
  const closed = plan.filter((entry) => isClosed(entry.steps)).length;
  const caption = `${countDone(steps)} z ${plural(steps.length, stepsGenitive)} · `
    + `${closed} z ${plural(plan.length, stagesGenitive)} ${pluralForm(closed, closedForms)}`;
  const card = element('section', 'card progress-card');
  card.append(
    gauge(progress(steps)),
    stageBar(plan, current),
    element('p', 'progress-caption', caption),
  );
  return card;
}

function gauge(percent) {
  const drawing = svgElement('svg', { class: 'gauge-drawing', viewBox: '0 0 208 110' });
  drawing.setAttribute('aria-hidden', 'true');
  drawing.append(gaugePath('gauge-track'));
  for (let index = 0; index <= 10; index += 1) {
    drawing.append(gaugeTick((Math.PI * index) / 10));
  }
  // A dash of length 0 with round caps would still show a dot at the start of the arc.
  if (percent > 0) {
    const fill = gaugePath('gauge-fill');
    fill.setAttribute('stroke-dasharray', `${percent} 100`);
    drawing.append(fill);
  }
  const node = element('div', 'gauge');
  node.append(drawing, element('p', 'gauge-percent', `${percent}%`));
  return node;
}

// With pathLength 100 the dash length along the arc is simply the percent.
function gaugePath(className) {
  return svgElement('path', {
    class: className, d: gaugeArc, pathLength: 100, 'stroke-width': 12,
  });
}

function gaugeTick(angle) {
  const [x1, y1] = arcPoint(75, angle);
  const [x2, y2] = arcPoint(81, angle);
  return svgElement('line', { class: 'gauge-tick', x1, y1, x2, y2, 'stroke-width': 1.5 });
}

function arcPoint(radius, angle) {
  return [104 - radius * Math.cos(angle), 104 - radius * Math.sin(angle)];
}

function svgElement(tag, attributes) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) {
    node.setAttribute(name, value);
  }
  return node;
}

function stageBar(plan, current) {
  const bar = element('div', 'stage-bar');
  bar.setAttribute('aria-hidden', 'true');
  for (const entry of plan) {
    bar.append(element('span', segmentClass(entry, current)));
  }
  return bar;
}

// When every stage is closed, the last one is current but keeps the closed colour, as in the plan.
function segmentClass(entry, current) {
  if (isClosed(entry.steps)) {
    return 'stage-segment stage-segment-closed';
  }
  return entry === current ? 'stage-segment stage-segment-current' : 'stage-segment';
}

function nextStepsSection(plan, steps, today) {
  const allSteps = element('a', 'section-link', 'Cały plan');
  allSteps.href = '#/plan';
  allSteps.dataset.id = 'all-steps';
  const heading = element('div', 'section-header');
  heading.append(element('h2', 'section-title', 'Najbliższe kroki'), allSteps);
  return [heading, nextStepsCard(plan, steps, today, allSteps)];
}

function nextStepsCard(plan, steps, today, allSteps) {
  if (steps.length === 0) {
    const toPlan = element('a', 'button button-tonal', 'Przejdź do planu');
    toPlan.href = '#/plan';
    return textCard('Nie masz jeszcze kroków', toPlan);
  }
  const next = nextSteps(plan);
  if (next.length === 0) {
    return textCard('Wszystkie kroki zrobione');
  }
  const list = element('ul', 'card list');
  list.append(...next.map((step) => stepRow(step, today)));
  list.addEventListener('change', (event) => {
    toggleStep(steps, event.target);
    // A done step leaves the list, so focus moves to a link that stays after the redraw.
    allSteps.focus();
  });
  list.addEventListener('click', (event) => {
    const step = clickedStep(steps, event.target);
    if (step) {
      openStepSheet(plan, { step, removeFocus: 'all-steps' });
    }
  });
  return list;
}

function savingsCard(totals, purchase) {
  const card = element('a', 'card savings');
  card.href = '#/budzet';
  const collected = `${formatAmount(totals.collected)} z ${formatAmount(totals.total)}`;
  card.append(
    savingsRow(
      element('span', 'savings-title', 'Zebrane'),
      element('span', 'savings-meta', collected),
    ),
    percentBar(totals.percent, 'Zebrane'),
    savingsRow(
      element('span', 'savings-meta', 'Zakup około'),
      element('span', 'savings-title', purchase.message ?? formatMonth(purchase.month)),
    ),
  );
  return card;
}

function savingsRow(...parts) {
  const row = element('div', 'savings-row');
  row.append(...parts);
  return row;
}

function textCard(text, ...extra) {
  const card = element('section', 'card');
  card.append(element('p', null, text), ...extra);
  return card;
}

function isEmpty(data) {
  return ['stages', 'questions', 'costs']
    .every((store) => data[store].every((record) => record.deleted));
}

function welcomeCard() {
  const scratch = element('a', 'button', 'Zacznij od zera');
  scratch.href = '#/plan';
  const card = element('section', 'card');
  card.append(
    element('h2', 'card-title', 'Zacznij od treści'),
    element('p', null, 'Aplikacja jest pusta. Plan, pytania i koszty wczytasz z paczki treści '
      + 'albo dodasz sam.'),
    button('Wczytaj paczkę z pliku', 'button button-primary', importFile),
    button('Zobacz przykład', 'button button-secondary', loadExample),
    scratch,
  );
  return card;
}
