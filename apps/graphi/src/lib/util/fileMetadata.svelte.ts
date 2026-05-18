import { browser } from '$app/environment';

export interface FileMetadata {
  icon?: string;
}

const STORAGE_KEY = 'graphi-file-metadata';
const EXPANSION_KEY = 'graphi-explorer-expansion';
const UI_KEY = 'graphi-ui-state';

// Svelte 5 Reactive Metadata
export const fileMetadata = $state<Record<string, FileMetadata>>(
  browser ? JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') : {}
);

export const expansionStore = $state<Record<string, boolean>>(
  browser ? JSON.parse(localStorage.getItem(EXPANSION_KEY) || '{}') : {}
);

export const explorerVisible = $state<{ visible: boolean }>(
  browser ? JSON.parse(localStorage.getItem(UI_KEY) || '{"visible":true}') : { visible: true }
);

// Persistence via effects
if (browser) {
  $effect.root(() => {
    $effect(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fileMetadata));
    });
    $effect(() => {
      localStorage.setItem(EXPANSION_KEY, JSON.stringify(expansionStore));
    });
    $effect(() => {
      localStorage.setItem(UI_KEY, JSON.stringify(explorerVisible));
    });
  });
}

export const fileMetadataStore = {
  setIcon: (path: string, icon: string | null) => {
    console.log(`Setting icon for ${path} to ${icon}`);
    if (!icon || icon === 'Default') {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete fileMetadata[path];
    } else {
      fileMetadata[path] = { icon };
    }
  }
};
