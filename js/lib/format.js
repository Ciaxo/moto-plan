const numbers = new Intl.NumberFormat('pl-PL');
const pluralRules = new Intl.PluralRules('pl-PL');
const formIndex = { one: 0, few: 1, many: 2 };

export function plural(count, forms) {
  const form = forms[formIndex[pluralRules.select(count)]];
  return `${numbers.format(count)} ${form}`;
}
