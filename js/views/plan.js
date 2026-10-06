import { save } from '../db.js';
import { formatDate, localDate } from '../lib/dates.js';
import { formatAmount, plural } from '../lib/format.js';
import { countDone, currentStage, isClosed, planStages } from '../lib/plan.js';
import { addButton, button, checkbox, element, icon, screenHeader } from '../ui/elements.js';
import { openStageSheet } from './stage-sheet.js';
import { openStepSheet } from './step-sheet.js';

export const stepsGenitive =['kroku', 'kroków', 'kroków'];
const emptyText = 'Plan składa się z etapów, a każdy etap z kroków do odhaczenia. '
  + 'Zacznij od pierwszego etapu.';
const expanded = new Set();
let lastCurrentId;

export function renderPlan(data, entered) {
  const plan = planStages(data.stages, data.steps);
  const current = currentStage(plan);
  expandCurrent(current, entered);
  const steps = plan.flatMap((entry) => entry.steps);
  const eyebrow = `${countDone(steps)} z ${plural(steps.length, stepsGenitive)}`;
  const addStage = addButton('Dodaj etap', 'add-stage', () => openStageSheet(plan));
  const screen = document.createDocumentFragment();
  screen.append(screenHeader('Plan', { eyebrow }));
  if (plan.length === 0) {
    const empty = element('section', 'card');
    empty.append(element('p', null, emptyText), addStage);
    screen.append(empty);
    return screen;
  }
  const context = { plan, today: localDate(new Date()) };
  const timeline = element('ol', 'timeline');
  plan.forEach((entry, index) => {
    timeline.append(stageItem(entry, index + 1, entry === current, context));
  });
  timeline.addEventListener('change', (event) => toggleStep(steps, event.target));
  timeline.addEventListener('click', (event) => {
    const step = clickedStep(steps, event.target);
    if (step) {
      openStepSheet(plan, { step, removeFocus: `add-step-${step.stageId}` });
    }
  });
  screen.append(timeline, addStage);
  return screen;
}

function expandCurrent(current, entered) {
  if (entered) {
    expanded.clear();
  }
  const id = current?.stage.id;
  if (id && (entered || id !== lastCurrentId)) {
    expanded.add(id);
  }
  lastCurrentId = id;
}

export function toggleStep(steps, checkbox) {
  const step = steps.find((item) => item.id === checkbox.value);
  const done = checkbox.checked;
  save('steps', { ...step, done, doneAt: done ? new Date().toISOString() : null });
}

export function clickedStep(steps, target) {
  const row = target.closest('.row-main');
  return row && steps.find((step) => step.id === row.value);
}

function stageItem(entry, number, isCurrent, context) {
  const { stage, steps } = entry;
  const card = element('details', 'card fold');
  card.open = expanded.has(stage.id);
  card.addEventListener('toggle', () => {
    if (card.open) {
      expanded.add(stage.id);
    } else {
      expanded.delete(stage.id);
    }
  });
  card.append(stageSummary(stage, steps, number), stageBody(entry, context));
  const item = element('li', 'stage');
  if (isCurrent) {
    item.setAttribute('aria-current', 'step');
  }
  item.append(card);
  return item;
}

function stageSummary(stage, steps, number) {
  const closed = isClosed(steps);
  const marker = element('span', closed ? 'stage-marker stage-marker-closed' : 'stage-marker');
  marker.append(closed ? icon('check') : String(number));
  const heading = element('span', 'stage-heading');
  heading.append(element('span', 'row-title', stage.title));
  if (stage.period) {
    heading.append(element('span', 'row-meta', stage.period));
  }
  const chevron = icon('chevron-down');
  chevron.classList.add('fold-chevron');
  const summary = element('summary', 'fold-summary');
  summary.dataset.id = `stage-${stage.id}`;
  summary.append(
    marker,
    heading,
    element('span', 'stage-count', `${countDone(steps)}/${steps.length}`),
    chevron,
  );
  return summary;
}

function stageBody(entry, { plan, today }) {
  const { stage, steps } = entry;
  const progress = element('progress', 'progress progress-sm');
  // A max of 0 is ignored, so a stage without steps shows an empty bar.
  progress.max = steps.length;
  progress.value = countDone(steps);
  progress.setAttribute('aria-label', `Postęp etapu ${stage.title}`);
  const list = element('ul', 'list');
  list.append(...steps.map((step) => stepRow(step, today)));
  const addStep = addButton('Dodaj krok', `add-step-${stage.id}`, () => {
    openStepSheet(plan, { stageId: stage.id });
  });
  const editStage = button('Edytuj etap', 'button', () => openStageSheet(plan, entry));
  editStage.dataset.id = `edit-stage-${stage.id}`;
  const actions = element('div', 'stage-actions');
  actions.append(addStep, editStage);
  const body = element('div', 'stage-body');
  body.append(progress, list, actions);
  return body;
}

export function stepRow(step, today) {
  const check = checkbox(step.title, step.id, step.done);
  check.querySelector('input').dataset.id = `done-${step.id}`;
  const main = element('button', 'row-main');
  main.type = 'button';
  main.value = step.id;
  main.dataset.id = `step-${step.id}`;
  main.append(element('span', 'row-title', step.title));
  const meta = stepMeta(step, today);
  if (meta) {
    main.append(element('span', 'row-meta', meta));
  }
  const row = element('li', 'row');
  row.append(check, main);
  return row;
}

function stepMeta(step, today) {
  if (step.done) {
    return `zrobione ${formatDate(localDate(new Date(step.doneAt)), today)}`;
  }
  const parts = [];
  if (step.dueDate) {
    parts.push(formatDate(step.dueDate, today));
  }
  if (step.cost !== null) {
    parts.push(formatAmount(step.cost));
  }
  return parts.join(' · ');
}
