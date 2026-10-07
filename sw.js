importScripts('./js/version.js');

const CACHE = `moto-plan-${self.APP_VERSION}`;

// Every app file in the order of `git ls-files`. README shows how to compare the two.
const FILES = [
  './',
  './css/base.css',
  './css/components.css',
  './css/tokens.css',
  './css/views.css',
  './data/example-pack.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/sprite.svg',
  './index.html',
  './js/app.js',
  './js/backup.js',
  './js/content.js',
  './js/db.js',
  './js/lib/backup.js',
  './js/lib/budget.js',
  './js/lib/dates.js',
  './js/lib/format.js',
  './js/lib/order.js',
  './js/lib/pack.js',
  './js/lib/plan.js',
  './js/lib/search.js',
  './js/lib/text.js',
  './js/router.js',
  './js/theme-init.js',
  './js/theme.js',
  './js/ui/elements.js',
  './js/ui/sheet.js',
  './js/update.js',
  './js/version.js',
  './js/views/budget.js',
  './js/views/cost-sheet.js',
  './js/views/data.js',
  './js/views/deposit-sheet.js',
  './js/views/knowledge.js',
  './js/views/motorcycle.js',
  './js/views/plan.js',
  './js/views/question-sheet.js',
  './js/views/question.js',
  './js/views/stage-sheet.js',
  './js/views/start.js',
  './js/views/step-sheet.js',
  './manifest.webmanifest',
];

async function install() {
  // Not from the HTTP cache: GitHub Pages lets the browser keep a file for 10 minutes, so a new
  // version could otherwise store an old file.
  const requests = FILES.map((file) => new Request(file, { cache: 'reload' }));
  const cache = await caches.open(CACHE);
  await cache.addAll(requests);
}

// Only our own caches: every site under the same github.io account shares this storage.
async function removeOldCaches() {
  const names = await caches.keys();
  const old = names.filter((name) => name.startsWith('moto-plan-') && name !== CACHE);
  await Promise.all(old.map((name) => caches.delete(name)));
}

async function respond(request) {
  const cache = await caches.open(CACHE);
  return (await cache.match(request)) ?? fetch(request);
}

self.addEventListener('install', (event) => event.waitUntil(install()));
self.addEventListener('activate', (event) => event.waitUntil(removeOldCaches()));
self.addEventListener('fetch', (event) => event.respondWith(respond(event.request)));

// A new version takes over open pages only when the user asks for it on the update bar.
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
