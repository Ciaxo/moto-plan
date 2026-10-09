import { exportBackup, importFile } from '../backup.js';
import { deleteDatabase } from '../db.js';
import { backupAge, needsBackup } from '../lib/backup.js';
import { formatDate, localDate } from '../lib/dates.js';
import { nouns, plural } from '../lib/format.js';
import { installedPacks } from '../lib/pack.js';
import { forgetTheme, setTheme } from '../theme.js';
import { backLink, button, dot, element, icon, screenHeader, segmented } from '../ui/elements.js';
import { openConfirm, openErrors, openSaveError } from '../ui/sheet.js';

const days = ['dzień', 'dni', 'dni'];
const deleteText = 'Plan, pytania, budżet i ustawienia znikną z tego urządzenia. '
  + 'Jeśli chcesz je zachować, najpierw wyeksportuj kopię.';
const waitingText = 'Moto Plan jest otwarty w innej karcie albo oknie. '
  + 'Zamknij go tam, a dane usuną się same.';

const keptText = 'Przeglądarka zachowa te dane, nawet gdy zabraknie miejsca na urządzeniu.';
const mayRemoveText = 'Przeglądarka może usunąć te dane, gdy zabraknie miejsca na urządzeniu. '
  + 'Regularnie eksportuj kopię.';

const themes = [
  ['light', 'Jasny'],
  ['dark', 'Ciemny'],
  ['system', 'Jak system'],
];

export function renderData(data) {
  const today = localDate(new Date());
  const screen = document.createDocumentFragment();
  screen.append(
    backLink('#/start', 'Start'),
    screenHeader('Dane i ustawienia'),
    backupCard(data, today),
    contentCard(data, today),
    themeCard(data),
    privacyCard(),
    footer(data),
    deleteButton(),
  );
  return screen;
}

function backupCard(data, today) {
  const status = element('p', 'backup-status');
  if (needsBackup(data, today)) {
    status.append(dot());
  }
  status.append(backupStatus(backupAge(data, today)));
  const exportButton = button('Eksportuj do pliku', 'button button-primary', exportBackup);
  exportButton.prepend(icon('download'));
  exportButton.dataset.id = 'export';
  const importButton = button('Importuj z pliku', 'button button-secondary', importFile);
  importButton.prepend(icon('upload'));
  importButton.dataset.id = 'import';
  const card = element('section', 'card');
  card.append(
    element('h2', 'card-title', 'Kopia zapasowa'),
    status,
    exportButton,
    importButton,
    element('p', 'backup-note', 'Jeden plik ze wszystkimi danymi. '
      + 'Import łączy wpisy i pyta, zanim coś nadpisze.'),
  );
  return card;
}

function backupStatus(age) {
  if (age === null) {
    return 'Nie masz jeszcze kopii';
  }
  if (age <= 0) {
    return 'Ostatnia kopia dzisiaj';
  }
  if (age === 1) {
    return 'Ostatnia kopia wczoraj';
  }
  return `Ostatnia kopia ${plural(age, days)} temu`;
}

function contentCard(data, today) {
  const packs = Object.values(installedPacks(data));
  const card = element('section', 'card');
  card.append(element('h2', 'card-title', 'Treść'));
  if (packs.length === 0) {
    card.append(element('p', null, 'Nie wczytano żadnej paczki'));
  } else {
    const list = element('ul', 'list');
    for (const pack of packs) {
      const loaded = formatDate(localDate(new Date(pack.importedAt)), today);
      const item = element('li', 'row pack-row');
      item.append(
        element('span', 'row-title', pack.title),
        element('span', 'row-meta', `Wersja ${pack.version} · wczytana ${loaded}`),
      );
      list.append(item);
    }
    card.append(list);
  }
  const loadPack = button('Wczytaj paczkę treści', 'button button-secondary', importFile);
  loadPack.dataset.id = 'import-pack';
  card.append(loadPack);
  return card;
}

function themeCard(data) {
  const card = element('section', 'card');
  // From the data, not from theme.js: after a backup import the theme there is applied a bit later.
  const current = data.settings.find((record) => record.id === 'theme')?.value ?? 'system';
  const options = segmented('theme', themes, current);
  options.setAttribute('aria-label', 'Wygląd');
  options.addEventListener('change', (event) => {
    setTheme(event.target.value).catch(() => {
      options.querySelector(`[value="${current}"]`).checked = true;
      openSaveError();
    });
  });
  card.append(element('h2', 'card-title', 'Wygląd'), options);
  return card;
}

function privacyCard() {
  const text = element('div');
  text.append(
    element('h2', 'privacy-title', 'Aplikacja nie wysyła żadnych danych'),
    element('p', 'privacy-text', 'Wszystko jest zapisane tylko na tym urządzeniu. '
      + 'Bez konta, bez chmury, bez statystyk.'),
  );
  if (navigator.storage) {
    text.append(persistence());
  }
  const card = element('section', 'card privacy');
  card.append(icon('shield'), text);
  return card;
}

// The screen is drawn at once, but the browser answers only with a promise.
function persistence() {
  const line = element('p', 'privacy-text');
  navigator.storage.persisted().then((kept) => {
    line.textContent = kept ? keptText : mayRemoveText;
  });
  return line;
}

function footer(data) {
  const counts = ['steps', 'questions', 'costs'].map((store) => {
    const count = data[store].filter((record) => !record.deleted).length;
    return plural(count, nouns[store]);
  });
  const text = [`Moto Plan ${self.APP_VERSION}`, ...counts].join(' · ');
  return element('footer', 'screen-footer', text);
}

function deleteButton() {
  const node = button('Usuń wszystkie dane', 'button button-secondary delete-all', () => {
    openConfirm('Usunąć wszystkie dane?', deleteText, 'Usuń wszystkie dane', () => {
      openConfirm('Na pewno?', 'Tego nie da się cofnąć.', 'Usuń na zawsze', deleteAll);
    });
  });
  node.dataset.id = 'delete-all';
  return node;
}

// A reload opens a fresh empty database and starts the theme from scratch.
async function deleteAll() {
  try {
    await deleteDatabase(() => {
      openErrors('Usuwanie czeka', [waitingText]);
    });
  } catch {
    // The connection is closed by then, so nothing can be saved again until the page reloads.
    openErrors('Nie udało się usunąć danych', ['Odśwież stronę i spróbuj jeszcze raz.']);
    return;
  }
  forgetTheme();
  history.replaceState(null, '', '#/start');
  location.reload();
}
