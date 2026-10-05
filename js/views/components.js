import { openSheet, closeSheet } from '../ui/sheet.js';

export function renderComponents() {
  const preview = document.querySelector('.components-preview').content.cloneNode(true);
  preview.querySelector('.open-sheet').addEventListener('click', openDemoSheet);
  return preview;
}

function openDemoSheet() {
  const form = document.querySelector('.sheet-demo').content.cloneNode(true);
  for (const button of form.querySelectorAll('button')) {
    button.addEventListener('click', closeSheet);
  }
  openSheet('Nowy krok', form);
}
