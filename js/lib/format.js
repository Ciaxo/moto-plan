const numbers = new Intl.NumberFormat('pl-PL');
const pluralRules = new Intl.PluralRules('pl-PL');
const formIndex = { one: 0, few: 1, many: 2 };

// Polish formatting leaves four-digit numbers ungrouped by default: 1200, but 12 000.
const amounts = new Intl.NumberFormat('pl-PL', {
  maximumFractionDigits: 0,
  useGrouping: 'always',
});

export function plural(count, forms) {
  const form = forms[formIndex[pluralRules.select(count)]];
  return `${numbers.format(count)} ${form}`;
}

export function formatAmount(amount) {
  // A no-break space keeps "zł" on the same line as the number.
  return `${amounts.format(amount)} zł`;
}
