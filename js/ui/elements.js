export function screenHeader(title) {
  const header = document.createElement('header');
  header.className = 'screen-header';
  const heading = document.createElement('h1');
  heading.className = 'screen-title';
  heading.textContent = title;
  header.append(heading);
  return header;
}
