import { ordered } from './order.js';

export function planStages(stages, steps) {
  const liveSteps = ordered(steps);
  return ordered(stages).map((stage) => ({
    stage,
    steps: liveSteps.filter((step) => step.stageId === stage.id),
  }));
}

export function countDone(steps) {
  return steps.filter((step) => step.done).length;
}

export function isClosed(steps) {
  return steps.length > 0 && countDone(steps) === steps.length;
}

export function currentStage(plan) {
  return plan.find(({ steps }) => !isClosed(steps)) ?? plan.at(-1);
}

export function progress(steps) {
  if (steps.length === 0) {
    return 0;
  }
  // Multiplying first keeps the numbers whole: 29 / 100 * 100 gives 28.999999999999996.
  return Math.floor((countDone(steps) * 100) / steps.length);
}

export function nextSteps(plan) {
  // The sort is stable, so steps with the same due end keep plan order: stage, then step.
  return plan
    .flatMap(({ steps }) => steps.filter((step) => !step.done))
    .sort((a, b) => dueEnd(a.dueDate).localeCompare(dueEnd(b.dueDate)))
    .slice(0, 3);
}

// "Some time in 2027" ends after "12 February 2027", and steps without a date go last.
function dueEnd(dueDate) {
  const [year = '9999', month = '99', day = '99'] = dueDate ? dueDate.split('-') : [];
  return `${year}-${month}-${day}`;
}
