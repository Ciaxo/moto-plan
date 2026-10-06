import { countList, importPack } from './content.js';
import { loadAll, restoreAll, save } from './db.js';
import { mergeBackup, SCHEMA_VERSION, validateBackup } from './lib/backup.js';
import { formatDate, localDate } from './lib/dates.js';
import { loadTheme } from './theme.js';
import { button, element } from './ui/elements.js';
import { closeSheet, openConfirm, openErrors, openSheet } from './ui/sheet.js';

const fileTitle = 'Nie można wczytać pliku';
const readError = 'Nie udało się odczytać pliku.';
const unknownFile = 'Ten plik nie jest kopią zapasową ani paczką treści Moto Plan.';
const backupTitle = 'Nie można wczytać kopii';
const saveError = 'Nie udało się wczytać kopii. Dane w aplikacji się nie zmieniły.';
const replaceText = 'Dane w aplikacji zostaną zastąpione danymi z kopii. '
  + 'Jeśli nie masz ich w innej kopii, anuluj i najpierw je wyeksportuj.';

export async function exportBackup() {
  const now = new Date();
  const exportedAt = now.toISOString();
  // Saved first, so the file carries its own date and restoring it does not look like no backup.
  await save('settings', { id: 'lastExportAt', value: exportedAt });
  const backup = {
    app: 'moto-plan',
    type: 'backup',
    schemaVersion: SCHEMA_VERSION,
    exportedAt,
    data: await loadAll(),
  };
  download(`moto-plan-${localDate(now)}.json`, JSON.stringify(backup, null, 2));
}

function download(name, text) {
  const link = element('a');
  // Not revoked: a browser may read the URL only after click() returns, and the file is small.
  link.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  link.download = name;
  link.click();
}

export function importFile() {
  const input = element('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.addEventListener('change', () => openFile(input.files[0]));
  input.click();
}

async function openFile(file) {
  let text;
  try {
    text = await file.text();
  } catch {
    openErrors(fileTitle, [readError]);
    return;
  }
  const content = parse(text);
  if (content?.app === 'moto-plan' && content.type === 'content') {
    importPack(content);
  } else if (content?.app === 'moto-plan' && content.type === 'backup') {
    importBackup(content);
  } else {
    openErrors(fileTitle, [unknownFile]);
  }
}

function parse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function importBackup(backup) {
  const data = await loadAll();
  const errors = validateBackup(backup, data);
  if (errors.length > 0) {
    openErrors(backupTitle, errors);
    return;
  }
  const { changes, counts } = mergeBackup(backup, data);
  const date = formatDate(localDate(new Date(backup.exportedAt)), localDate(new Date()));
  const merge = button('Połącz', 'button button-primary', () => {
    merge.disabled = true;
    restore(changes, false);
  });
  const records = Object.keys(data)
    .flatMap((store) => backup.data[store].map((record) => ({ store, record })));
  const replace = button('Zastąp wszystko', 'button button-secondary', () => {
    openConfirm('Zastąpić wszystko?', replaceText, 'Zastąp wszystko', () => {
      restore(records, true);
    });
  });
  const body = document.createDocumentFragment();
  body.append(
    element('p', null, `Kopia z ${date}`),
    countList(counts),
    merge,
    replace,
    button('Anuluj', 'button', closeSheet),
  );
  openSheet('Wczytać kopię?', body);
}

async function restore(changes, replace) {
  try {
    await restoreAll(changes, replace);
  } catch {
    openErrors(backupTitle, [saveError]);
    return;
  }
  // Closed before the redraw ends, so focus returns to the import button and survives it.
  closeSheet();
  await loadTheme();
}
