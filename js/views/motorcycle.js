import { element, screenHeader, icon } from '../ui/elements.js';

const upcoming = [
  ['Dokumenty', 'Co masz, gdzie leży, co wozić przy sobie'],
  ['Koszty i przebieg', 'Paliwo, serwis, kilometry, statystyki'],
  ['Terminy', 'OC, badanie techniczne, serwis'],
  ['Miejsce postoju', 'Gdzie teraz stoi motocykl'],
];

export function renderMotorcycle() {
  const screen = document.createDocumentFragment();
  screen.append(
    screenHeader('Motocykl', { eyebrow: 'Włączy się po zakupie' }),
    teaserCard(),
    element('h2', 'section-title', 'Co się tu pojawi'),
    upcomingList(),
  );
  return screen;
}

function teaserCard() {
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
    element('p', 'teaser-text', 'Do tego czasu ta zakładka czeka.'),
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
