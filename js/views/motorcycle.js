import { budgetSettings, budgetTotals, forecast } from '../lib/budget.js';
import { localDate } from '../lib/dates.js';
import { plural } from '../lib/format.js';
import { element, screenHeader, icon } from '../ui/elements.js';

const monthsGenitive = ['miesiąca', 'miesięcy', 'miesięcy'];

const upcoming = [
  ['Dokumenty', 'Co masz, gdzie leży, co wozić przy sobie'],
  ['Koszty i przebieg', 'Paliwo, serwis, kilometry, statystyki'],
  ['Terminy', 'OC, badanie techniczne, serwis'],
  ['Miejsce postoju', 'Gdzie teraz stoi motocykl'],
];

export function renderMotorcycle(data) {
  const screen = document.createDocumentFragment();
  screen.append(
    screenHeader('Motocykl', { eyebrow: 'Włączy się po zakupie' }),
    teaserCard(countdown(data)),
    element('h2', 'section-title', 'Co się tu pojawi'),
    upcomingList(),
  );
  return screen;
}

// Only a month forecast gives a count, a message such as "Ustaw miesięczną wpłatę" gives nothing.
function countdown(data) {
  const { monthlyDeposit } = budgetSettings(data.settings);
  const totals = budgetTotals(data.costs, data.deposits);
  const { months } = forecast(totals, monthlyDeposit, localDate(new Date()));
  return months ? `Do zakupu zostało około ${plural(months, monthsGenitive)}. ` : '';
}

function teaserCard(prefix) {
  const sketch = icon('motorcycle-sketch');
  sketch.setAttribute('class', 'illustration');
  // Same viewBox as the symbol, so the drawing keeps its proportions at any width.
  sketch.setAttribute('viewBox', '0 0 150 84');
  const budget = element('a', 'button button-tonal', 'Zobacz budżet');
  budget.href = '#/budzet';
  const card = element('section', 'card teaser');
  card.append(
    sketch,
    element('h2', 'teaser-title', 'Tu zamieszka Twój motocykl'),
    element('p', 'teaser-text', `${prefix}Do tego czasu ta zakładka czeka.`),
    budget,
  );
  return card;
}

function upcomingList() {
  const list = element('ul', 'upcoming');
  for (const [title, description] of upcoming) {
    const item = element('li', 'upcoming-item');
    item.append(element('h3', 'upcoming-title', title), element('p', 'upcoming-text', description));
    list.append(item);
  }
  return list;
}
