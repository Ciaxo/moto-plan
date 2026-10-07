import { button, element } from './ui/elements.js';

const bar = document.querySelector('.update-bar');

export async function startUpdates() {
  let registration;
  try {
    registration = await navigator.serviceWorker?.register('./sw.js', { updateViaCache: 'none' });
  } catch {
    // Without a service worker, as in a Firefox private window, the app works, only not offline.
    return;
  }
  if (!registration) {
    return;
  }
  // A page loaded with Ctrl+F5 has no controller and would never see the new version take over.
  if (registration.waiting && navigator.serviceWorker.controller) {
    showBar(registration);
  }
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    worker.addEventListener('statechange', () => {
      // The first install also reaches "installed", but there is no old version to replace then.
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        showBar(registration);
      }
    });
  });
  // An installed app can stay in the background for days without being opened again.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      registration.update().catch(() => {});
    }
  });
}

function showBar(registration) {
  const refresh = button('Odśwież', 'button button-tonal', () => {
    refresh.disabled = true;
    const waiting = registration.waiting;
    // Another tab has already switched to the new version.
    if (!waiting) {
      location.reload();
      return;
    }
    // Set only here, so a takeover from another tab or from DevTools never reloads this page.
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(),
      { once: true });
    waiting.postMessage('skipWaiting');
  });
  bar.replaceChildren(element('p', 'update-text', 'Jest nowa wersja'), refresh);
}
