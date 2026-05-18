import { browser } from '$app/environment';
import { v4 as uuidv4 } from 'uuid';
import { getSiteFiles, removeSiteFile, saveSiteFile, type VirtualFile } from './idb';

export const siteFiles = $state<VirtualFile[]>([]);

export async function loadSiteWorkspace() {
  if (!browser) return;
  const files = await getSiteFiles();
  siteFiles.splice(0, siteFiles.length, ...files.sort((a, b) => a.order - b.order));
}

export async function createVirtualFile(name: string, content = '', parentPath = 'root') {
  const newFile: VirtualFile = {
    content,
    id: uuidv4(),
    isFolder: false,
    name,
    order: siteFiles.length,
    parentPath
  };
  siteFiles.push(newFile);
  await saveSiteFile($state.snapshot(newFile));
  return newFile;
}

export async function createVirtualFolder(name: string, parentPath = 'root') {
  const newFolder: VirtualFile = {
    content: '',
    id: uuidv4(),
    isFolder: true,
    name,
    order: siteFiles.length,
    parentPath
  };
  siteFiles.push(newFolder);
  await saveSiteFile($state.snapshot(newFolder));
  return newFolder;
}

export async function deleteVirtualItem(id: string) {
  const index = siteFiles.findIndex((f) => f.id === id);
  if (index !== -1) {
    siteFiles.splice(index, 1);
    await removeSiteFile(id);
  }
}

export async function updateVirtualItem(file: VirtualFile) {
  const index = siteFiles.findIndex((f) => f.id === file.id);
  if (index !== -1) {
    siteFiles[index] = file;
    await saveSiteFile($state.snapshot(file));
  }
}

export async function moveVirtualItem(id: string, newParentPath: string, newOrder?: number) {
  const file = siteFiles.find((f) => f.id === id);
  if (file) {
    file.parentPath = newParentPath;
    if (newOrder !== undefined) file.order = newOrder;
    await updateVirtualItem(file);
  }
}
