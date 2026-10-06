import { addMonths } from './dates.js';
import { ordered } from './order.js';

const defaults = { goalMode: 'single', monthlyDeposit: 0 };

export function budgetSettings(settings) {
  const value = (id) => settings.find((record) => record.id === id)?.value ?? defaults[id];
  return { goalMode: value('goalMode'), monthlyDeposit: value('monthlyDeposit') };
}

export function budgetTotals(costs, deposits) {
  const live = costs.filter((cost) => !cost.deleted);
  const collected = sum(deposits.filter((deposit) => !deposit.deleted));
  const spent = sum(live.filter((cost) => cost.status === 'paid'));
  const total = sum(live);
  return {
    collected,
    spent,
    total,
    onAccount: collected - spent,
    missing: Math.max(0, total - collected),
    percent: percentOf(collected, total),
  };
}

export function forecast({ total, missing }, monthlyDeposit, today) {
  if (total === 0) {
    return { message: 'Dodaj koszty' };
  }
  if (missing === 0) {
    return { message: 'Cel osiągnięty' };
  }
  if (monthlyDeposit <= 0) {
    return { message: 'Ustaw miesięczną wpłatę' };
  }
  const months = Math.ceil(missing / monthlyDeposit);
  return { months, month: addMonths(today.slice(0, 7), months) };
}

export function goalFunding(goals, costs, deposits) {
  const liveCosts = ordered(costs);
  const liveDeposits = deposits.filter((deposit) => !deposit.deleted);
  const list = ordered(goals);
  let pool = sum(liveDeposits.filter((deposit) => deposit.goalId === null));
  const result = [];
  for (const [index, goal] of list.entries()) {
    const goalCosts = liveCosts.filter((cost) => cost.goalId === goal.id);
    const value = sum(goalCosts);
    const manual = sum(liveDeposits.filter((deposit) => deposit.goalId === goal.id));
    const taken = index === list.length - 1 ? pool : Math.min(pool, Math.max(0, value - manual));
    pool -= taken;
    const funded = manual + taken;
    result.push({
      goal,
      costs: goalCosts,
      value,
      funded,
      spent: sum(goalCosts.filter((cost) => cost.status === 'paid')),
      percent: percentOf(funded, value),
      covered: value > 0 && funded >= value,
    });
  }
  return result;
}

export function currentGoal(funding) {
  return funding.find((entry) => entry.value > 0 && !entry.covered);
}

export function depositsByDate(deposits) {
  return deposits
    .filter((deposit) => !deposit.deleted)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

function sum(records) {
  return records.reduce((total, record) => total + record.amount, 0);
}

function percentOf(part, whole) {
  if (whole === 0) {
    return 0;
  }
  // Multiplying first keeps the numbers whole, as in the plan progress.
  return Math.min(100, Math.floor((part * 100) / whole));
}
