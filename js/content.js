import { loadAll, saveAll } from './db.js';
import { nouns, plural } from './lib/format.js';
import { installedPacks, mergePack, validatePack } from './lib/pack.js';
import { button, element } from './ui/elements.js';
import { closeSheet, openErrors, openSheet } from './ui/sheet.js';

const countForms = [
  ['added', ['nowy wpis', 'nowe wpisy', 'nowych wpisów']],
  ['updated', ['wpis do aktualizacji', 'wpisy do aktualizacji', 'wpisów do aktualizacji']],
  ['unchanged', ['wpis bez zmian', 'wpisy bez zmian', 'wpisów bez zmian']],
  ['skipped', [
    'pominięty wpis (zmieniony albo usunięty w aplikacji)',
    'pominięte wpisy (zmienione albo usunięte w aplikacji)',
    'pominiętych wpisów (zmienionych albo usuniętych w aplikacji)',
  ]],
];

const sameVersionNote = 'Ta wersja paczki jest już wczytana. '
  + 'Ponowne wczytanie niczego nie podwoi.';
const otherPackNote = 'W aplikacji jest już treść z innej paczki. '
  + 'Nowa treść zostanie dodana obok obecnej.';
const errorTitle = 'Nie można wczytać paczki';
const exampleError = 'Nie udało się pobrać przykładowej paczki.';
const saveError = 'Nie udało się zapisać paczki. Dane w aplikacji się nie zmieniły.';

export async function loadExample() {
  let pack;
  try {
    const response = await fetch('./data/example-pack.json');
    pack = await response.json();
  } catch {
    openErrors(errorTitle, [exampleError]);
    return;
  }
  await importPack(pack);
}

export async function importPack(pack) {
  const data = await loadAll();
  const errors = validatePack(pack, data);
  if (errors.length > 0) {
    openErrors(errorTitle, errors);
    return;
  }
  openSheet('Wczytać paczkę?', summary(pack, installedPacks(data), mergePack(pack, data)));
}

function summary(pack, installed, { changes, counts }) {
  const sameVersion = installed[pack.packId]?.version === pack.version;
  const otherPack = !installed[pack.packId] && Object.keys(installed).length > 0;
  const name = element('p');
  name.append(element('strong', null, pack.title));
  const body = document.createDocumentFragment();
  body.append(name, element('p', null, packContents(pack)));
  const nothingNew = counts.added + counts.updated + counts.skipped === 0;
  if (!(sameVersion && nothingNew)) {
    body.append(countList(counts));
  }
  if (sameVersion) {
    body.append(element('p', null, sameVersionNote));
  }
  if (otherPack) {
    body.append(element('p', null, otherPackNote));
  }
  const confirm = button(otherPack ? 'Dodaj' : 'Wczytaj', 'button button-primary', () => {
    confirm.disabled = true;
    // A new importedAt alone would raise updatedAt of the pack list, like a rewritten record.
    if (sameVersion && changes.length === 0) {
      closeSheet();
      return;
    }
    save(pack, installed, changes);
  });
  body.append(confirm, button('Anuluj', 'button', closeSheet));
  return body;
}

function packContents(pack) {
  const parts = [`Wersja ${pack.version}`];
  for (const [collection, forms] of Object.entries(nouns)) {
    const count = pack[collection]?.length ?? 0;
    if (count > 0) {
      parts.push(plural(count, forms));
    }
  }
  return parts.join(' · ');
}

function countList(counts) {
  const list = element('ul');
  for (const [key, forms] of countForms) {
    if (counts[key] > 0) {
      list.append(element('li', null, plural(counts[key], forms)));
    }
  }
  return list;
}

async function save(pack, installed, changes) {
  const packs = {
    ...installed,
    [pack.packId]: {
      title: pack.title,
      version: pack.version,
      importedAt: new Date().toISOString(),
    },
  };
  try {
    await saveAll([...changes, { store: 'settings', record: { id: 'packs', value: packs } }]);
    closeSheet();
  } catch {
    openErrors(errorTitle, [saveError]);
  }
}
