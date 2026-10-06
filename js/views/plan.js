import { save } from '../db.js';
import { formatDate, localDate } from '../lib/dates.js';
import { formatAmount, plural } from '../lib/format.js';
import { countDone, currentStage, isClosed, planStages } from '../lib/plan.js';
import { element, icon, screenHeader } from '../ui/elements.js';

const stepsGenitive = ['kroku', 'kroków', 'kroków'];
const expanded = new Set();
let lastCurrentId;

export function renderPlan(data, entered) {
  const plan = planStages(data.stages, data.steps);
  const current = currentStage(plan);
  expandCurrent(current, entered);
  const today = localDate(new Date());
  const steps = plan.flatMap((entry) => entry.steps);
  const timeline = element('ol', 'timeline');
  plan.forEach((entry, index) => {
    timeline.append(stageItem(entry, index + 1, entry === current, today));
  });
  timeline.addEventListener('change', (event) => toggleStep(steps, event.target));
  const eyebrow = `${countDone(steps)} z ${plural(steps.length, stepsGenitive)}`;
  const screen = document.createDocumentFragment();
  screen.append(screenHeader('Plan', { eyebrow }), timeline);
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

function toggleStep(steps, checkbox) {
  const step = steps.find((item) => item.id === checkbox.value);
  const done = checkbox.checked;
  save('steps', { ...step, done, doneAt: done ? new Date().toISOString() : null });
}

function stageItem({ stage, steps }, number, isCurrent, today) {
  const card = element('details', 'card stage-card');
  card.open = expanded.has(stage.id);
  card.addEventListener('toggle', () => {
    if (card.open) {
      expanded.add(stage.id);
    } else {
      expanded.delete(stage.id);
    }
  });
  card.append(stageSummary(stage, steps, number), stageBody(stage, steps, today));
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
  chevron.classList.add('stage-chevron');
  const summary = element('summary', 'stage-summary');
  summary.dataset.id = `stage-${stage.id}`;
  summary.append(
    marker,
    heading,
    element('span', 'stage-count', `${countDone(steps)}/${steps.length}`),
    chevron,
  );
  return summary;
}

function stageBody(stage, steps, today) {
  const progress = element('progress', 'progress progress-sm');
  // A max of 0 is ignored, so a stage without steps shows an empty bar.
  progress.max = steps.length;
  progress.value = countDone(steps);
  progress.setAttribute('aria-label', `Postęp etapu ${stage.title}`);
  const list = element('ul', 'list');
  list.append(...steps.map((step) => stepRow(step, today)));
  const body = element('div', 'stage-body');
  body.append(progress, list);
  return body;
}

function stepRow(step, today) {
  const checkbox = element('input');
  checkbox.type = 'checkbox';
  checkbox.checked = step.done;
  checkbox.value = step.id;
  checkbox.dataset.id = `done-${step.id}`;
  checkbox.setAttribute('aria-label', step.title);
  const mark = icon('check');
  mark.classList.add('check-mark');
  const check = element('label', 'check');
  check.append(checkbox, mark);
  const main = element('button', 'row-main');
  main.type = 'button';
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
