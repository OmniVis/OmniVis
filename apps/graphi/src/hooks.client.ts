import type { HandleClientError } from '@sveltejs/kit';

// Reload the page when a chunk fails to load (e.g. after a new deployment
// causes stale browser cache to request chunks that no longer exist).
window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message ?? '';
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Unable to preload CSS')
  ) {
    window.location.reload();
  }
});

export const handleError: HandleClientError = ({ error, event }) => {
  console.error('Client error:', error, event);
};
