import JSZip from 'jszip';
import type { VirtualFile } from './idb';

/**
 * Exports a list of virtual files and folders to a ZIP file.
 * @param files The flat list of VirtualFile objects to export.
 * @param rootId The ID of the item to start exporting from (default 'root' for everything).
 * @param zipName The name of the resulting ZIP file.
 */
export async function exportToZip(
  files: VirtualFile[],
  rootId = 'root',
  zipName = 'workspace-export.zip'
) {
  const zip = new JSZip();

  // Helper to get recursive path
  const getPath = (item: VirtualFile): string => {
    if (item.parentPath === 'root') return item.name;
    const parent = files.find((f) => f.id === item.parentPath);
    if (!parent) return item.name;
    return `${getPath(parent)}/${item.name}`;
  };

  // Helper to check if an item belongs to the root being exported
  const isChildOf = (item: VirtualFile, potentialParentId: string): boolean => {
    if (potentialParentId === 'root') return true;
    if (item.id === potentialParentId) return true;
    if (item.parentPath === 'root') return false;
    if (item.parentPath === potentialParentId) return true;
    const parent = files.find((f) => f.id === item.parentPath);
    if (!parent) return false;
    return isChildOf(parent, potentialParentId);
  };

  // If rootId is not 'root', find the root item to determine the base name
  if (rootId !== 'root') {
    const rootItem = files.find((f) => f.id === rootId);
    if (rootItem && rootItem.isFolder) {
      getPath(rootItem);
    }
  }

  // Filter items that belong to the export root
  let itemsToExport: VirtualFile[] = [];
  if (rootId === 'root') {
    itemsToExport = files;
  } else {
    const target = files.find((f) => f.id === rootId);
    if (target && !target.isFolder) {
      itemsToExport = [target];
    } else {
      itemsToExport = files.filter((f) => isChildOf(f, rootId));
    }
  }

  itemsToExport.forEach((item) => {
    if (item.isFolder) {
      // Create folder in zip
      const relativePath = getPath(item);
      if (relativePath) zip.folder(relativePath);
    } else {
      // Add file to zip
      const relativePath = getPath(item);
      // Ensure file has .dia extension
      const fileName = item.name.match(/\.(mmd|mermaid|txt|json|dia|md)$/i)
        ? item.name.replace(/\.(mmd|mermaid|txt|json|md)$/i, '.dia')
        : `${item.name}.dia`;

      let fullPath = relativePath;
      if (!fullPath.includes('/')) {
        fullPath = fileName;
      } else {
        const parts = fullPath.split('/');
        parts[parts.length - 1] = fileName;
        fullPath = parts.join('/');
      }

      zip.file(fullPath, item.content);
    }
  });

  const content = await zip.generateAsync({ type: 'blob' });
  downloadBlob(content, zipName);
}

export async function exportSpecificItems(
  allFiles: VirtualFile[],
  selectedIds: string[],
  zipName = 'workspace-export.zip'
) {
  const zip = new JSZip();

  // Helper to get recursive path
  const getPath = (item: VirtualFile): string => {
    if (item.parentPath === 'root') return item.name;
    const parent = allFiles.find((f) => f.id === item.parentPath);
    if (!parent) return item.name;
    return `${getPath(parent)}/${item.name}`;
  };

  const selectedFiles = allFiles.filter((f) => selectedIds.includes(f.id));

  selectedFiles.forEach((item) => {
    if (item.isFolder) {
      const relativePath = getPath(item);
      if (relativePath) zip.folder(relativePath);
    } else {
      const relativePath = getPath(item);
      const fileName = item.name.match(/\.(mmd|mermaid|txt|json|dia|md)$/i)
        ? item.name.replace(/\.(mmd|mermaid|txt|json|md)$/i, '.dia')
        : `${item.name}.dia`;

      let fullPath = relativePath;
      if (!fullPath.includes('/')) {
        fullPath = fileName;
      } else {
        const parts = fullPath.split('/');
        parts[parts.length - 1] = fileName;
        fullPath = parts.join('/');
      }
      zip.file(fullPath, item.content);
    }
  });

  const content = await zip.generateAsync({ type: 'blob' });
  downloadBlob(content, zipName);
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
