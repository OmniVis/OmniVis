// src/lib/util/fileSystem.test.ts
import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/paths', () => ({ base: '' }));
vi.mock('$app/environment', () => ({ browser: true }));
vi.mock('./idb', () => ({
  getHandles: vi.fn().mockResolvedValue({}),
  getSiteFiles: vi.fn().mockResolvedValue([]),
  removeHandle: vi.fn(),
  removeSiteFile: vi.fn(),
  saveHandle: vi.fn(),
  saveSiteFile: vi.fn()
}));
vi.mock('svelte-sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() }
}));

import { toast } from 'svelte-sonner';
import {
  activeCloudFileId,
  activeFileHandle,
  activeVirtualFileId,
  currentGraphName,
  lastSavedAt,
  lastSavedCode,
  saveActiveFile,
  saveStatus
} from './fileSystem';

describe('saveActiveFile — cloud branch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    activeCloudFileId.set(null);
    activeVirtualFileId.set(null);
    activeFileHandle.set(null);
    currentGraphName.set('Untitled Diagram');
    lastSavedCode.set('');
    lastSavedAt.set(null);
    saveStatus.set('saved');
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('issues PUT and updates stores on success', async () => {
    activeCloudFileId.set('abc-123');
    currentGraphName.set('My Diagram');
    localStorage.setItem('graphi_user_id', 'user-uuid');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    const result = await saveActiveFile('flowchart TD\n  A --> B');

    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/graphs/abc-123',
      expect.objectContaining({ method: 'PUT' })
    );
    expect(get(lastSavedCode)).toBe('flowchart TD\n  A --> B');
    expect(get(saveStatus)).toBe('success');
    expect(get(lastSavedAt)).toBeInstanceOf(Date);
    expect(toast.success).toHaveBeenCalledWith('Saved to Cloud · "My Diagram"');
  });

  it('returns false and error toast when cloud PUT fails', async () => {
    activeCloudFileId.set('abc-123');
    localStorage.setItem('graphi_user_id', 'user-uuid');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const result = await saveActiveFile('flowchart TD\n  A --> B');

    expect(result).toBe(false);
    expect(get(saveStatus)).toBe('unsaved');
    expect(get(lastSavedCode)).toBe('');
    expect(toast.error).toHaveBeenCalledWith('Failed to save to Cloud. Check your connection.');
  });

  it('returns false and error toast when not logged in', async () => {
    activeCloudFileId.set('abc-123');
    localStorage.removeItem('graphi_user_id');

    const result = await saveActiveFile('flowchart TD\n  A --> B');

    expect(result).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('Sign in to save to Cloud');
  });
});
