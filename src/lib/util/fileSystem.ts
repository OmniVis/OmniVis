import { toast } from 'svelte-sonner';
import { get, writable } from 'svelte/store';
import { getHandles, removeHandle, saveHandle } from './idb';

export interface FileEntry {
  name: string;
  kind: 'file' | 'directory';
  handle: FileSystemFileHandle | FileSystemDirectoryHandle;
  children?: FileEntry[];
  path: string; // Absolute-ish path (root_name/path)
  rootName: string; // The name of the root folder
}

export const rootHandles = writable<Record<string, FileSystemDirectoryHandle>>({});
export const individualFiles = writable<FileEntry[]>([]);
export const fileList = writable<FileEntry[]>([]);
export const activeFileHandle = writable<FileSystemFileHandle | null>(null);
export const activeVirtualFileId = writable<string | null>(null);
export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'blocked' | 'success';
export const saveStatus = writable<SaveStatus>('saved');
export const lastSavedCode = writable<string>('');

export async function openDirectory(): Promise<void> {
  if (!('showDirectoryPicker' in window)) {
    toast.error(
      'File System Access API is not supported in this browser. Try Chrome, Edge, or Opera.'
    );
    return;
  }
  try {
    const handle = await window.showDirectoryPicker();
    console.log('Directory handle selected:', handle.name);
    await addRoot(handle);
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Error opening directory:', error);
      toast.error('Failed to open directory. Check console for details.');
    }
  }
}

export async function openFiles(): Promise<void> {
  if (!('showOpenFilePicker' in window)) {
    toast.error(
      'File System Access API is not supported in this browser. Try Chrome, Edge, or Opera.'
    );
    return;
  }
  try {
    // @ts-expect-error - File System API types are experimental
    const handles = await window.showOpenFilePicker({
      multiple: true,
      types: [
        {
          description: 'Mermaid Diagrams',
          accept: {
            'text/plain': ['.mmd', '.mermaid', '.txt', '.dia', '.md']
          }
        }
      ]
    });

    const newEntries: FileEntry[] = handles.map((handle) => ({
      handle,
      kind: 'file',
      name: handle.name,
      path: `files/${handle.name}`,
      rootName: 'files'
    }));

    individualFiles.update((files) => [...files, ...newEntries]);
    await refreshDirectory();
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Error opening files:', error);
      toast.error('Failed to open files.');
    }
  }
}

export async function addRoot(handle: FileSystemDirectoryHandle) {
  console.log('Adding root:', handle.name);
  rootHandles.update((roots) => {
    roots[handle.name] = handle;
    console.log('Updated rootHandles', Object.keys(roots));
    return roots;
  });
  await saveHandle(handle.name, handle);
  await refreshDirectory();
}

export async function removeRoot(name: string, shouldRefresh = true) {
  rootHandles.update((roots) => {
    const newRoots = { ...roots };
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete newRoots[name];
    return newRoots;
  });
  await removeHandle(name);
  if (shouldRefresh) {
    await refreshDirectory();
  }
}

export async function removeFile(path: string) {
  individualFiles.update((files) => {
    const file = files.find((f) => f.path === path);
    // If the active file is being removed, clear it
    if (file && get(activeFileHandle) === file.handle) {
      activeFileHandle.set(null);
      saveStatus.set('saved');
    }
    return files.filter((f) => f.path !== path);
  });
  await refreshDirectory();
}

export async function loadRoots() {
  const handles = await getHandles();
  // We need to request permission for each handle because they are persisted
  const validHandles: Record<string, FileSystemDirectoryHandle> = {};

  for (const [name, handle] of Object.entries(handles)) {
    if (handle.kind === 'directory') {
      validHandles[name] = handle as FileSystemDirectoryHandle;
    }
  }

  rootHandles.set(validHandles);
  await refreshDirectory();
}

export async function refreshDirectory(): Promise<void> {
  const roots = get(rootHandles);
  console.log('Refreshing directory. Roots:', Object.keys(roots));
  const allEntries: FileEntry[] = [];

  for (const [name, handle] of Object.entries(roots)) {
    try {
      // Permission check - also serves as a check if the handle is still valid
      const permission = await handle.queryPermission({ mode: 'readwrite' });
      console.log(`Permission for ${name}:`, permission);
      if (permission === 'granted') {
        const entries = await readDirectory(handle, name, name);
        console.log(`Entries found for ${name}:`, entries.length);
        allEntries.push({
          children: entries,
          handle,
          kind: 'directory',
          name,
          path: name,
          rootName: name
        });
      } else {
        // We'll show a "needs permission" item in the UI later
        allEntries.push({
          children: [],
          handle,
          kind: 'directory',
          name: `${name} (Click to re-authorize)`,
          path: name,
          rootName: name
        });
      }
    } catch (error) {
      console.error(`Error accessing root ${name}:`, error);
      // If the entry is gone or inaccessible, we should consider removing it or at least not showing it as "needs reauth"
      const err = error as Error;
      if (
        err.name === 'NotFoundError' ||
        err.name === 'InvalidStateError' ||
        err.name === 'NotAllowedError' || // Sometimes stale handles throw this
        err.message.toLowerCase().includes('not found') ||
        err.message.toLowerCase().includes('inaccessible') ||
        err.message.toLowerCase().includes('no longer valid') ||
        err.message.toLowerCase().includes('could not find')
      ) {
        console.warn(`Root ${name} is invalid or gone, removing from explorer.`);
        // We call removeRoot with shouldRefresh = false to avoid recursion
        await removeRoot(name, false);
      } else {
        // For other errors (like permission denied), still show it but maybe with an error status
        allEntries.push({
          children: [],
          handle: roots[name],
          kind: 'directory',
          name: `${name} (Error accessing)`,
          path: name,
          rootName: name
        });
      }
    }
  }
  fileList.set([...allEntries, ...get(individualFiles)]);
}

async function readDirectory(
  dirHandle: FileSystemDirectoryHandle,
  rootName: string,
  path = ''
): Promise<FileEntry[]> {
  const entries: FileEntry[] = [];

  try {
    for await (const entry of dirHandle.values()) {
      const entryPath = `${path}/${entry.name}`;

      if (entry.kind === 'file') {
        if (/\.(mmd|mermaid|txt|json|dia|md)$/i.test(entry.name)) {
          entries.push({
            handle: entry as FileSystemFileHandle,
            kind: 'file',
            name: entry.name,
            path: entryPath,
            rootName
          });
        }
      } else if (entry.kind === 'directory') {
        entries.push({
          children: await readDirectory(entry as FileSystemDirectoryHandle, rootName, entryPath),
          handle: entry as FileSystemDirectoryHandle,
          kind: 'directory',
          name: entry.name,
          path: entryPath,
          rootName
        });
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${path}:`, err);
  }

  return entries.sort((a, b) => {
    if (a.kind === b.kind) return a.name.localeCompare(b.name);
    return a.kind === 'directory' ? -1 : 1;
  });
}

export async function readFile(fileHandle: FileSystemFileHandle): Promise<string> {
  activeFileHandle.set(fileHandle); // Set active handle on read
  const file = await fileHandle.getFile();
  const text = await file.text();

  const { unpackFileContent } = await import('./fileContent');
  const { code: rawCode } = unpackFileContent(text);
  lastSavedCode.set(rawCode); // Sync last saved code on load (unpacked)
  return text;
}

export async function writeFile(fileHandle: FileSystemFileHandle, content: string): Promise<void> {
  try {
    console.log(`Writing to ${fileHandle.name}, content length: ${content.length}`);
    console.log(`Snippet: ${content.substring(0, 50)}...`);

    // Permission check - queryPermission doesn't require user gesture
    // @ts-expect-error - File System API types are experimental
    const permission = await fileHandle.queryPermission({ mode: 'readwrite' });
    if (permission !== 'granted') {
      console.warn('Write permission not granted for:', fileHandle.name);
      saveStatus.set('blocked');
      throw new Error('Permission denied');
    }

    saveStatus.set('saving');
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    console.log(`Successfully finished write to ${fileHandle.name}`);

    const { unpackFileContent } = await import('./fileContent');
    const { code: rawCode } = unpackFileContent(content);
    lastSavedCode.set(rawCode);

    saveStatus.set('success');
    setTimeout(() => {
      if (get(saveStatus) === 'success') {
        saveStatus.set('saved');
      }
    }, 2000);
    console.log('Successfully wrote to:', fileHandle.name);
  } catch (error) {
    console.error('Error writing file:', error);
    saveStatus.set('unsaved');
    throw error;
  }
}

export async function saveActiveFile(content: string): Promise<boolean> {
  const handle = get(activeFileHandle);
  const virtualId = get(activeVirtualFileId);

  if (virtualId) {
    const { siteFiles, updateVirtualItem } = await import('./siteWorkspace.svelte');
    const file = siteFiles.find((f) => f.id === virtualId);
    if (file) {
      saveStatus.set('saving');
      file.content = content;
      await updateVirtualItem(file);
      console.log(`Successfully updated virtual file: ${file.name} (${virtualId})`);

      const { unpackFileContent } = await import('./fileContent');
      const { code: rawCode } = unpackFileContent(content);
      lastSavedCode.set(rawCode);

      saveStatus.set('success');
      setTimeout(() => {
        if (get(saveStatus) === 'success') {
          saveStatus.set('saved');
        }
      }, 2000);
      return true;
    }
  }

  if (!handle) return false;

  try {
    // requestPermission MUST be called from a user gesture (like a button click)
    // @ts-expect-error - File System API types are experimental
    const permission = await handle.requestPermission({ mode: 'readwrite' });
    if (permission === 'granted') {
      await writeFile(handle, content);
      return true;
    }
  } catch (error) {
    console.error('Error saving active file:', error);
    toast.error('Failed to save to file. Check console for details.');
  }
  return false;
}

export async function saveFile(content: string, suggestedName = 'diagram.dia'): Promise<boolean> {
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [
        {
          description: 'Mermaid Diagram',
          accept: { 'text/vnd.mermaid': ['.dia'] }
        }
      ]
    });
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();

    activeFileHandle.set(handle);
    lastSavedCode.set(content);

    saveStatus.set('success');
    setTimeout(() => {
      if (get(saveStatus) === 'success') {
        saveStatus.set('saved');
      }
    }, 2000);

    return true;
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Error saving file:', error);
      throw error;
    }
  }
  return false;
}
