const sheet = document.querySelector('.sheet');
const title = sheet.querySelector('.sheet-title');
const content = sheet.querySelector('.sheet-content');

sheet.querySelector('.sheet-close').addEventListener('click', closeSheet);

export function openSheet(heading, body) {
  title.textContent = heading;
  content.replaceChildren(body);
  sheet.showModal();
}

export function closeSheet() {
  sheet.close();
}
