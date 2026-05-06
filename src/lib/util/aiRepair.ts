import { writable } from 'svelte/store';

/**
 * Holds a pending AI repair request.
 * Set from the error container to trigger the AI chat sidebar
 * to open and auto-send a repair prompt.
 */
export const aiRepairRequest = writable<string | null>(null);
