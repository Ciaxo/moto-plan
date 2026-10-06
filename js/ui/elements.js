const SVG_NS = 'http://www.w3.org/2000/svg';

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

export function screenHeader(title, { eyebrow, action } = {}) {
  const header = element('header', 'screen-header');
  if (eyebrow) {
    header.append(element('p', 'eyebrow', eyebrow));
  }
  header.append(element('h1', 'screen-title', title));
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

export function icon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `./icons/sprite.svg#${name}`);
  svg.append(use);
  return svg;
}

export function backLink(href, label) {
  const link = element('a', 'back-link');
  link.href = href;
  link.append(icon('back'), label);
  return link;
}
