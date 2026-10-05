export function screenHeader(title) {
  const header = document.createElement('header');
  const heading = document.createElement('h1');
  heading.textContent = title;
  header.append(heading);
  return header;
}
