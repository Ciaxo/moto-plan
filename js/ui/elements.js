const SVG_NS = 'http://www.w3.org/2000/svg';

export function screenHeader(title, { action } = {}) {
  const header = document.createElement('header');
  header.className = 'screen-header';
  const heading = document.createElement('h1');
  heading.className = 'screen-title';
  heading.textContent = title;
  header.append(heading);
  if (action) {
    header.append(action);
  }
  return header;
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
  const link = document.createElement('a');
  link.className = 'back-link';
  link.href = href;
  link.append(icon('back'), label);
  return link;
}
