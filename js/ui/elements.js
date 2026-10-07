export const SVG_NS = 'http://www.w3.org/2000/svg';
const dueKinds = [['none', 'Brak'], ['year', 'Rok'], ['month', 'Miesiąc'], ['day', 'Dzień']];
const kindByLength = { 0: 'none', 4: 'year', 7: 'month', 10: 'day' };
// Desktop Firefox has no month picker and shows a plain text field, hence the pattern.
const dueInputs = {
  year: { type: 'text', inputMode: 'numeric', pattern: '\\d{4}', placeholder: 'RRRR' },
  month: { type: 'month', pattern: '\\d{4}-\\d{2}', placeholder: 'RRRR-MM' },
  day: { type: 'date' },
};

export function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text) {
    node.textContent = text;
  }
  return node;
}

export function button(label, className, onClick) {
  const node = element('button', className, label);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}

export function addButton(label, id, onClick) {
  const node = button(label, 'button button-add', onClick);
  node.prepend(icon('plus'));
  node.dataset.id = id;
  return node;
}

export function screenHeader(title, { eyebrow, action } = {}) {
  const header = element('header', 'screen-header');
  if (eyebrow) {
    header.append(element('p', 'eyebrow', eyebrow));
  }
  const heading = element('h1', 'screen-title', title);
  // Focusable from code, as the fallback after a redraw, but not on the way of the Tab key.
  heading.tabIndex = -1;
  header.append(heading);
  if (action) {
    header.append(action);
  }
  return header;
}

export function field(label, control) {
  const node = element('label', 'field');
  node.append(element('span', 'field-label', label), control);
  return node;
}

export function select(name, options, value) {
  const node = Object.assign(element('select', 'input'), { name });
  for (const [optionValue, label] of options) {
    const option = element('option', null, label);
    option.value = optionValue;
    option.selected = optionValue === value;
    node.append(option);
  }
  const wrapper = element('span', 'select');
  wrapper.append(node, icon('chevron-down'));
  return wrapper;
}

export function segmented(name, options, value) {
  const group = element('fieldset', 'segmented');
  for (const [optionValue, label] of options) {
    const input = Object.assign(element('input'), {
      type: 'radio',
      name,
      value: optionValue,
      checked: optionValue === value,
    });
    input.dataset.id = `${name}-${optionValue}`;
    const option = element('label', 'segment');
    option.append(input, label);
    group.append(option);
  }
  return group;
}

export function checkbox(label, value, checked) {
  const input = Object.assign(element('input'), { type: 'checkbox', value, checked });
  input.setAttribute('aria-label', label);
  const mark = icon('check');
  mark.classList.add('check-mark');
  const node = element('label', 'check');
  node.append(input, mark);
  return node;
}

// The percent, not the amounts: with a total of 0 a max of 0 would turn into 1 and fill the bar.
export function percentBar(percent, label) {
  const bar = element('progress', 'progress');
  bar.max = 100;
  bar.value = percent;
  bar.setAttribute('aria-label', label);
  return bar;
}

export function dueField(dueDate) {
  const savedKind = kindByLength[dueDate.length];
  const kinds = segmented('due-kind', dueKinds, savedKind);
  // The legend already names the group, so the switch inside does not make a second, unnamed one.
  kinds.setAttribute('role', 'none');
  const group = element('fieldset', 'field');
  group.append(element('legend', 'field-label', 'Termin'), kinds);
  let input = dueInput(savedKind, dueDate);
  if (input) {
    group.append(input);
  }
  kinds.addEventListener('change', (event) => {
    input?.remove();
    const kind = event.target.value;
    input = dueInput(kind, kind === savedKind ? dueDate : '');
    if (input) {
      group.append(input);
    }
  });
  return group;
}

function dueInput(kind, value) {
  if (kind === 'none') {
    return null;
  }
  const input = Object.assign(element('input', 'input'), dueInputs[kind]);
  Object.assign(input, { name: 'due', required: true, value });
  input.setAttribute('aria-label', 'Termin');
  return input;
}

export function icon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `./icons/sprite.svg#${name}`);
  svg.append(use);
  return svg;
}

export function dot() {
  const node = element('span', 'dot');
  node.setAttribute('aria-hidden', 'true');
  return node;
}

export function backLink(href, label) {
  const link = element('a', 'back-link');
  link.href = href;
  link.append(icon('back'), label);
  return link;
}
