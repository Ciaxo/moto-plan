const numbers = new Intl.NumberFormat('pl-PL');
const pluralRules = new Intl.PluralRules('pl-PL');
const formIndex = { one: 0, few: 1, many: 2 };

export const nouns = {
  stages: ['etap', 'etapy', 'etapów'],
  steps: ['krok', 'kroki', 'kroków'],
  questions: ['pytanie', 'pytania', 'pytań'],
  costs: ['koszt', 'koszty', 'kosztów'],
};

// Polish formatting leaves four-digit numbers ungrouped by default: 1200, but 12 000.
const amounts = new Intl.NumberFormat('pl-PL', {
  maximumFractionDigits: 0,
  useGrouping: 'always',
});

export function plural(count, forms) {
  return `${numbers.format(count)} ${pluralForm(count, forms)}`;
}

export function pluralForm(count, forms) {
  return forms[formIndex[pluralRules.select(count)]];
}

export function formatAmount(amount) {
  // A no-break space keeps "zł" on the same line as the number.
  return `${amounts.format(amount)} zł`;
}
