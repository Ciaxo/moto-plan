export async function startUpdates() {
  try {
    await navigator.serviceWorker?.register('./sw.js', { updateViaCache: 'none' });
  } catch {
    // Without a service worker, as in a Firefox private window, the app works, only not offline.
  }
}
